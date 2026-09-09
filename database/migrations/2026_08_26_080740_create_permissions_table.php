<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ciian_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            // Null for the platform's own permissions. Set for one a created
            // system minted for a page of its own, so those disappear with the
            // system rather than outliving it as unassignable rows.
            $table->foreignId('system_id')
                ->nullable()
                ->constrained('ciian_sys')
                ->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciian_permissions');
    }
};
