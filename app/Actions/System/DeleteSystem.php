<?php

namespace App\Actions\System;

use App\Models\Ciian\System\System;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteSystem
{
    public function __construct(
        private GeneratePageFile $files,
        private GenerateSystemRoutes $routes,
    ) {}

    /**
     * Delete a system and everything generated for it.
     *
     * Its pages go with the row (`ciian_sys_pg.system_id` cascades), its page
     * folder under `resources/js/pages` is removed, and `routes/systems.php` is
     * rebuilt so the system stops answering on its prefix.
     *
     * A published system must be confirmed with the current user's password. The
     * caller verifies it and passes the flag, the same way `DeleteTable::handle()`
     * trusts `$confirmedPassword` — an unpublished draft serves nothing yet, so it
     * needs no confirmation.
     *
     * Tables are deliberately **not** cascaded. `ciian_sys_tbl` rows would be
     * removed by the foreign key while their physical tables and generated models
     * stayed behind, so a system that still owns tables is refused: delete them
     * from the Tables module first, where the DDL has its own safety rails.
     */
    public function handle(System $system, bool $confirmedPassword = false): void
    {
        if ($system->isPublished() && ! $confirmedPassword) {
            throw ValidationException::withMessages([
                'root_password' => __('This system is published. Confirm your password to delete it.'),
            ]);
        }

        $tables = $system->tables()->count();

        if ($tables > 0) {
            throw ValidationException::withMessages([
                'system' => __('This system still owns :count table(s). Delete them from the Tables module first.', [
                    'count' => $tables,
                ]),
            ]);
        }

        DB::transaction(fn () => $system->delete());

        // The row goes first: generated output without a row behind it is invisible
        // and blocks reusing the slug, while a row without its files is harmless.
        $this->routes->handle();
        $this->files->removeDirectory($system);
    }
}
