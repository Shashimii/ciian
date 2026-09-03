<?php

namespace App\Http\Controllers\Ciian\Component;

use App\Http\Controllers\Controller;
use App\Support\ComponentIndexPresenter;
use Inertia\Inertia;
use Inertia\Response;

class ComponentController extends Controller
{
    /**
     * List the UI building blocks available to the page builder.
     */
    public function index(ComponentIndexPresenter $presenter): Response
    {
        return Inertia::render('component/index', [
            'components' => $presenter->components(),
        ]);
    }
}
