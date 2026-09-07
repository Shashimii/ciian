<?php

namespace App\Http\Controllers\Ciian\Layout;

use App\Http\Controllers\Controller;
use App\Support\LayoutIndexPresenter;
use Inertia\Inertia;
use Inertia\Response;

class LayoutController extends Controller
{
    /**
     * List the page shells a page can be assigned to.
     */
    public function index(LayoutIndexPresenter $presenter): Response
    {
        return Inertia::render('layout/index', [
            'layouts' => $presenter->layouts(),
        ]);
    }
}
