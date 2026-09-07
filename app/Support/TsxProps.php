<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Reads the prop names a TSX default export destructures.
 *
 * Both uploaded shapes pin their keys to real props — a component's `properties`
 * and a layout's `regions` — so the check lives here rather than in either builder.
 */
class TsxProps
{
    /**
     * Prop names the default export destructures.
     *
     * @return list<string>
     */
    public static function destructured(string $tsx): array
    {
        $start = strpos($tsx, 'export default');

        if ($start === false) {
            return [];
        }

        $body = substr($tsx, $start);
        $open = strpos($body, '{');
        $close = strpos($body, '}');

        if ($open === false || $close === false || $close < $open) {
            return [];
        }

        $inner = substr($body, $open + 1, $close - $open - 1);
        $props = [];

        foreach (explode(',', $inner) as $part) {
            $name = trim(Str::before($part, '='));

            if (preg_match('/^[A-Za-z_$][\w$]*$/', $name) === 1) {
                $props[] = $name;
            }
        }

        return array_values(array_unique($props));
    }
}
