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
        Schema::create('ciian_config', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Ciian');
            $table->string('sys_slug')->unique()->default('ciian');
            $table->string('icon')->default('Sparkles');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciian_config');
    }
};
