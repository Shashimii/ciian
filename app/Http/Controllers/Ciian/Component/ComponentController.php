<?php

namespace App\Http\Controllers\Ciian\Component;

use App\Actions\Component\UploadComponent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ciian\Component\UploadComponentRequest;
use App\Models\Ciian\Component\Component;
use App\Support\ComponentIndexPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    /**
     * Show the upload form for a custom component.
     *
     * A component is code, so there is no builder UI: a developer uploads a JSON
     * definition holding the metadata and the TSX source.
     */
    public function create(Request $request, ComponentIndexPresenter $presenter): Response
    {
        $uploaded = Component::query()
            ->where('slug', (string) $request->query('uploaded', ''))
            ->first();

        return Inertia::render('component/create', [
            'propertyTypes' => $presenter->propertyTypeLabels(),
            'uploaded' => $uploaded === null ? null : $presenter->present($uploaded),
        ]);
    }

    /**
     * Show a single component: its information, properties, and a live preview.
     */
    public function show(Component $component, ComponentIndexPresenter $presenter): Response
    {
        return Inertia::render('component/view', [
            'component' => $presenter->presentDetail($component),
        ]);
    }

    /**
     * Generate a custom component from an uploaded YAML definition.
     */
    public function store(UploadComponentRequest $request, UploadComponent $uploadComponent): RedirectResponse
    {
        $component = $uploadComponent->handle($request->definitionYaml());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':name uploaded.', ['name' => $component->name]),
        ]);

        // Stay on the upload page: its preview panel can only render the component
        // once the file exists, so returning here is what makes the preview possible.
        return to_route('components.create', ['uploaded' => $component->slug]);
    }
}
