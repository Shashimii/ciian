<?php

namespace App\Console\Commands;

use App\Actions\System\GenerateSystemRoutes;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('ciian:sync-routes')]
#[Description('Rebuild routes/systems.php from the published systems and pages in the database')]
class SyncSystemRoutes extends Command
{
    /**
     * `routes/systems.php` is generated output and gitignored, so a fresh
     * checkout or a deploy starts without it and every published system 404s
     * until it is rebuilt. Run this after `migrate` in a deploy script.
     */
    public function handle(GenerateSystemRoutes $routes): int
    {
        $routes->handle();

        $this->components->info('Rebuilt routes/systems.php from the database.');

        return self::SUCCESS;
    }
}
