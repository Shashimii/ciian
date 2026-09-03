<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Checks whether a table's existing data would survive a sync, before any DDL runs.
 *
 * `ApplyTableSchema::sync()` already preserves data for ordinary edits by using
 * `change()` instead of drop-and-recreate, and the database's own strict-mode error
 * is a backstop for the rest. This class exists for the cases strict mode does not
 * catch: transformations a driver performs silently (rounding a DECIMAL's scale
 * down, truncating a shortened VARCHAR) rather than rejecting, where the "backstop"
 * would quietly corrupt data instead of failing loudly. It also turns whatever a
 * driver would reject into a plain-language, row-counted message instead of a raw
 * SQLSTATE.
 *
 * Every check runs in PHP against fetched values rather than as driver-specific raw
 * SQL (`STR_TO_DATE`, `INET6_ATON`, `JSON_VALID`, ...): this app is configured for
 * five different database connections (see `config/database.php`), and a predicate
 * written in one driver's SQL dialect would silently do nothing useful on the others.
 *
 * @see .ai/shapes/db_table_format.md
 */
class TableChangeInspector
{
    /**
     * Inclusive [min, max] storage bounds, as digit-string pairs so comparison never
     * has to fit unsigned bigint's upper bound into a PHP int.
     *
     * @var array<string, array{0: string, 1: string}>
     */
    private const INTEGER_BOUNDS = [
        'tinyIncrements' => ['0', '255'],
        'smallIncrements' => ['0', '65535'],
        'mediumIncrements' => ['0', '16777215'],
        'increments' => ['0', '4294967295'],
        'id' => ['0', '18446744073709551615'],
        'bigIncrements' => ['0', '18446744073709551615'],
        'tinyInteger' => ['-128', '127'],
        'unsignedTinyInteger' => ['0', '255'],
        'smallInteger' => ['-32768', '32767'],
        'unsignedSmallInteger' => ['0', '65535'],
        'mediumInteger' => ['-8388608', '8388607'],
        'unsignedMediumInteger' => ['0', '16777215'],
        'integer' => ['-2147483648', '2147483647'],
        'unsignedInteger' => ['0', '4294967295'],
        'bigInteger' => ['-9223372036854775808', '9223372036854775807'],
        'unsignedBigInteger' => ['0', '18446744073709551615'],
        'foreignId' => ['0', '18446744073709551615'],
    ];

    public function __construct(private ApplyTableSchema $schema) {}

    /**
     * Blocking problems a sync from $from to $to would hit, one line per column.
     * Empty when the table has no rows yet, or every rebuilt column is safe.
     *
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    public function findBlockingChanges(string $tableName, array $from, array $to): array
    {
        if (! Schema::hasTable($tableName)) {
            return [];
        }

        $totalRows = DB::table($tableName)->count();

        if ($totalRows === 0) {
            return [];
        }

        $problems = [];

        foreach ($this->schema->columnsChanged($from, $to) as $pair) {
            $problems = [
                ...$problems,
                ...$this->checkColumn($tableName, $totalRows, $pair['from'], $pair['to']),
            ];
        }

        return $problems;
    }

    /**
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    private function checkColumn(string $tableName, int $totalRows, array $from, array $to): array
    {
        // The column is still under its old (from) name until the rename runs.
        $name = (string) $from['name'];
        $problems = [];

        if (($from['nullable'] ?? false) && ! ($to['nullable'] ?? false)) {
            $nulls = DB::table($tableName)->whereNull($name)->count();
            $this->report($problems, 'made required (NOT NULL)', $nulls, $totalRows, $name);
        }

        if (! ($from['unique'] ?? false) && ($to['unique'] ?? false)) {
            $duplicated = DB::table($tableName)
                ->select($name)
                ->whereNotNull($name)
                ->groupBy($name)
                ->havingRaw('COUNT(*) > 1')
                ->limit(1)
                ->exists();

            if ($duplicated) {
                $problems[] = "Column [{$name}] can't become unique: it already contains duplicate values.";
            }
        }

        $problems = [...$problems, ...$this->checkLength($tableName, $totalRows, $name, $from, $to)];
        $problems = [...$problems, ...$this->checkPrecisionScale($tableName, $totalRows, $name, $from, $to)];

        $toType = (string) ($to['type'] ?? '');
        $typeChanged = ($from['type'] ?? null) !== $toType;

        if ($typeChanged) {
            $validator = $this->typeValidator($to);

            if ($validator !== null) {
                $fromType = (string) ($from['type'] ?? '');
                $fromLabel = ColumnTypes::definition($fromType)['label'] ?? $fromType;
                $toLabel = ColumnTypes::definition($toType)['label'] ?? $toType;

                $this->report(
                    $problems,
                    "changed from {$fromLabel}",
                    $this->violationCount($tableName, $name, $validator),
                    $totalRows,
                    $name,
                    suffix: " to {$toLabel}",
                );
            }
        }

        if (in_array($toType, ['enum', 'set'], true)) {
            $problems = [...$problems, ...$this->checkEnumSetValues($tableName, $totalRows, $name, $from, $to)];
        }

        return $problems;
    }

    /**
     * Count of non-null values in $column for which $isInvalid returns true.
     */
    private function violationCount(string $tableName, string $column, callable $isInvalid): int
    {
        return DB::table($tableName)
            ->whereNotNull($column)
            ->pluck($column)
            ->filter(fn (mixed $value): bool => $isInvalid((string) $value))
            ->count();
    }

    /**
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    private function checkLength(string $tableName, int $totalRows, string $name, array $from, array $to): array
    {
        $newLength = $this->effectiveLength($to);

        if ($newLength === null) {
            return [];
        }

        $oldLength = $this->effectiveLength($from);

        if ($oldLength !== null && $oldLength <= $newLength) {
            return [];
        }

        $problems = [];
        $this->report(
            $problems,
            "shortened to {$newLength} characters",
            $this->violationCount(
                $tableName,
                $name,
                fn (string $value): bool => mb_strlen($value) > $newLength,
            ),
            $totalRows,
            $name,
        );

        return $problems;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function effectiveLength(array $column): ?int
    {
        $type = (string) ($column['type'] ?? '');

        if ($type === 'rememberToken') {
            return 100;
        }

        if (! in_array($type, ['string', 'char'], true)) {
            return null;
        }

        $length = $column['length'] ?? null;

        return $length !== null && $length !== '' ? (int) $length : 255;
    }

    /**
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    private function checkPrecisionScale(string $tableName, int $totalRows, string $name, array $from, array $to): array
    {
        if (! in_array($to['type'] ?? null, ['decimal', 'float', 'double'], true)) {
            return [];
        }

        if (($from['type'] ?? null) !== $to['type']) {
            // A genuine type change is covered by the type validator instead; comparing
            // precision/scale across two different numeric types isn't meaningful.
            return [];
        }

        $problems = [];

        $oldScale = isset($from['scale']) ? (int) $from['scale'] : 2;
        $newScale = isset($to['scale']) ? (int) $to['scale'] : 2;

        if ($newScale < $oldScale) {
            // A narrowed DECIMAL scale is rounded silently rather than rejected — the
            // one case in this whole class where the database would not have caught
            // the loss on its own.
            $this->report(
                $problems,
                "rounded to {$newScale} decimal place".($newScale === 1 ? '' : 's'),
                $this->violationCount(
                    $tableName,
                    $name,
                    fn (string $value): bool => $this->fractionalDigits($value) > $newScale,
                ),
                $totalRows,
                $name,
            );
        }

        $oldPrecision = isset($from['precision']) ? (int) $from['precision'] : 8;
        $newPrecision = isset($to['precision']) ? (int) $to['precision'] : 8;

        if ($newPrecision < $oldPrecision) {
            $this->report(
                $problems,
                "narrowed to {$newPrecision} total digits",
                $this->violationCount(
                    $tableName,
                    $name,
                    fn (string $value): bool => $this->significantDigits($value, $newScale) > $newPrecision,
                ),
                $totalRows,
                $name,
            );
        }

        return $problems;
    }

    /**
     * Number of fractional digits in a numeric string, ignoring trailing zeros
     * ("12.100" has 1, matching what rounding to 1 decimal place would preserve).
     */
    private function fractionalDigits(string $value): int
    {
        if (preg_match('/\.(\d+)$/', $value, $matches) !== 1) {
            return 0;
        }

        return strlen(rtrim($matches[1], '0'));
    }

    /**
     * Total significant digits a numeric string would occupy once rounded to
     * $scale decimal places — DECIMAL(p,s)'s "p" counts integer and fractional
     * digits together, excluding the sign and decimal point.
     */
    private function significantDigits(string $value, int $scale): int
    {
        $value = ltrim($value, '-');

        // Re-derive digit count after rounding, rather than trusting the stored
        // string's own scale, since a value can carry more fractional digits than
        // the column's current scale in transit (e.g. a freshly imported row).
        $rounded = number_format((float) $value, $scale, '.', '');

        return strlen(str_replace(['.', '-'], '', ltrim($rounded, '0') ?: '0'));
    }

    /**
     * @param  array<string, mixed>  $from
     * @param  array<string, mixed>  $to
     * @return list<string>
     */
    private function checkEnumSetValues(string $tableName, int $totalRows, string $name, array $from, array $to): array
    {
        $newValues = array_map('strval', $to['values'] ?? []);

        if ($newValues === []) {
            return [];
        }

        $problems = [];

        if (($to['type'] ?? null) === 'enum') {
            $this->report(
                $problems,
                'no longer an allowed value',
                $this->violationCount(
                    $tableName,
                    $name,
                    fn (string $value): bool => ! in_array($value, $newValues, true),
                ),
                $totalRows,
                $name,
            );

            return $problems;
        }

        // set: a stored value is a comma-joined subset of the allowed values. Only the
        // values actually being removed can newly invalidate a row — a driver silently
        // drops any other malformed component rather than rejecting it, so this is the
        // one part of a SET value this probe can meaningfully protect.
        $oldValues = array_map('strval', $from['values'] ?? []);
        $removed = array_diff($oldValues, $newValues);

        if ($removed === []) {
            return [];
        }

        $this->report(
            $problems,
            'used a value being removed from the set ('.implode(', ', $removed).')',
            $this->violationCount(
                $tableName,
                $name,
                fn (string $value): bool => array_intersect(explode(',', $value), $removed) !== [],
            ),
            $totalRows,
            $name,
        );

        return $problems;
    }

    /**
     * A predicate that returns true when a value cannot be stored as `$to`'s type —
     * or null when the type has no meaningful, portable validity rule (see the class
     * docblock's driver-portability note, and the closing comment below).
     *
     * @param  array<string, mixed>  $to
     * @return (callable(string): bool)|null
     */
    private function typeValidator(array $to): ?callable
    {
        $type = (string) ($to['type'] ?? '');

        if (isset(self::INTEGER_BOUNDS[$type])) {
            [$min, $max] = self::INTEGER_BOUNDS[$type];
            $signed = str_starts_with($min, '-');
            $format = $signed ? '/^-?[0-9]+$/' : '/^[0-9]+$/';

            return function (string $value) use ($format, $min, $max): bool {
                if (preg_match($format, $value) !== 1) {
                    return true;
                }

                return ! $this->withinDigitBounds($value, $min, $max);
            };
        }

        if (in_array($type, ['decimal', 'float', 'double'], true)) {
            $unsigned = (bool) ($to['unsigned'] ?? false);

            return fn (string $value): bool => preg_match('/^-?[0-9]+(\.[0-9]+)?$/', $value) !== 1
                || ($unsigned && str_starts_with($value, '-'));
        }

        if ($type === 'boolean') {
            return fn (string $value): bool => ! in_array(strtolower($value), ['0', '1', 'true', 'false'], true);
        }

        if ($type === 'date') {
            return fn (string $value): bool => ! $this->isValidDate($value);
        }

        if (in_array($type, ['dateTime', 'dateTimeTz', 'timestamp', 'timestampTz'], true)) {
            return function (string $value): bool {
                $datePart = explode(' ', $value, 2)[0];

                return ! $this->isValidDate($datePart) || ! $this->isValidTimeOfDay($value, allowDateTime: true);
            };
        }

        if (in_array($type, ['time', 'timeTz'], true)) {
            return fn (string $value): bool => ! $this->isValidTimeOfDay($value, allowDateTime: false);
        }

        if ($type === 'year') {
            return fn (string $value): bool => preg_match('/^[0-9]{1,4}$/', $value) !== 1
                || (int) $value < 1901 || (int) $value > 2155;
        }

        if (in_array($type, ['json', 'jsonb'], true)) {
            return function (string $value): bool {
                json_decode($value);

                return json_last_error() !== JSON_ERROR_NONE;
            };
        }

        if (in_array($type, ['uuid', 'foreignUuid'], true)) {
            return fn (string $value): bool => preg_match(
                '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
                $value,
            ) !== 1;
        }

        if (in_array($type, ['ulid', 'foreignUlid'], true)) {
            // Length + Crockford base32 charset, not full canonical-encoding
            // validation — a reasonable approximation rather than a hand-rolled parser.
            return fn (string $value): bool => preg_match('/^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/', $value) !== 1;
        }

        if ($type === 'ipAddress') {
            return fn (string $value): bool => filter_var($value, FILTER_VALIDATE_IP) === false;
        }

        if ($type === 'macAddress') {
            return fn (string $value): bool => preg_match('/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/', $value) !== 1;
        }

        // No reliable, driver-portable validity rule exists for these — left to the
        // database's own rejection (surfaced via the existing error modal) rather than
        // risk a check that could be confidently wrong: geometry/geography/vector need
        // a real spatial or vector engine to validate against, and binary/text/string/
        // char/enum/set (values handled separately above) accept arbitrary content.
        return null;
    }

    /**
     * Whether $value, a non-negative or negative decimal-digit string, falls within
     * [$min, $max] — compared as digit strings so bounds larger than PHP_INT_MAX
     * (unsigned bigint's upper bound) never need to fit in a PHP int.
     */
    private function withinDigitBounds(string $value, string $min, string $max): bool
    {
        return $this->compareDigitStrings($value, $min) >= 0
            && $this->compareDigitStrings($value, $max) <= 0;
    }

    /**
     * <=> for arbitrary-precision signed integers written as decimal digit strings.
     */
    private function compareDigitStrings(string $a, string $b): int
    {
        $aNegative = str_starts_with($a, '-');
        $bNegative = str_starts_with($b, '-');

        if ($aNegative !== $bNegative) {
            return $aNegative ? -1 : 1;
        }

        $aDigits = ltrim($aNegative ? substr($a, 1) : $a, '0') ?: '0';
        $bDigits = ltrim($bNegative ? substr($b, 1) : $b, '0') ?: '0';

        $result = strlen($aDigits) <=> strlen($bDigits) ?: strcmp($aDigits, $bDigits) <=> 0;

        return $aNegative ? -$result : $result;
    }

    private function isValidDate(string $value): bool
    {
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $value, $matches) !== 1) {
            return false;
        }

        return checkdate((int) $matches[2], (int) $matches[3], (int) $matches[1]);
    }

    private function isValidTimeOfDay(string $value, bool $allowDateTime): bool
    {
        $timePart = $allowDateTime
            ? (explode(' ', $value, 2)[1] ?? null)
            : $value;

        if ($timePart === null) {
            // A date-only value is a valid moment for a datetime/timestamp column.
            return true;
        }

        if (preg_match('/^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/', $timePart, $matches) !== 1) {
            return false;
        }

        $hours = (int) $matches[1];
        $minutes = (int) $matches[2];
        $seconds = (int) ($matches[3] ?? 0);

        return $hours >= 0 && $hours <= 23
            && $minutes >= 0 && $minutes <= 59
            && $seconds >= 0 && $seconds <= 59;
    }

    /**
     * @param  list<string>  $problems
     */
    private function report(
        array &$problems,
        string $action,
        int $violations,
        int $totalRows,
        string $column,
        string $suffix = '',
    ): void {
        if ($violations === 0) {
            return;
        }

        $problems[] = "Column [{$column}] can't be {$action}{$suffix}: {$violations} of {$totalRows} rows would lose data.";
    }
}
