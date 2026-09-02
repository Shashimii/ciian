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
        Schema::create('ciian_int_tbl', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tag')->default('ciian')->index();
            $table->string('icon')->default('Sparkles');
            $table->string('status')->default('unpublished')->index();
            $table->boolean('can_delete')->default(true);
            $table->longText('unpub_shape')->nullable();
            $table->longText('pub_shape')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciian_int_tbl');
    }
};
