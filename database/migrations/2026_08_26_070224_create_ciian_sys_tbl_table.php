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
        Schema::create('ciian_sys_tbl', function (Blueprint $table) {
            $table->id();
            $table->foreignId('system_id')->constrained('ciian_sys')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('status')->default('unpublished')->index();
            $table->boolean('can_delete')->default(true);
            $table->longText('unpub_shape')->nullable();
            $table->longText('pub_shape')->nullable();
            $table->timestamps();

            $table->unique(['system_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ciian_sys_tbl');
    }
};
