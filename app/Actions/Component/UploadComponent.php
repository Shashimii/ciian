<?php

namespace App\Actions\Component;

use App\Models\Ciian\Component\Component;
use App\Support\ComponentShapeBuilder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;
use Throwable;

/**
 * Turns an uploaded YAML definition into a real component: a generated TSX file
 * under `resources/js/components/custom/` and a row in `ciian_cmp`.
 */
class UploadComponent
{
    public function __construct(private ComponentShapeBuilder $shapes) {}

    /**
     * @throws ValidationException
     */
    public function handle(string $yaml): Component
    {
        $definition = $this->parse($yaml);
        $slug = (string) $definition['information']['slug'];

        if (Component::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages([
                'file' => __('A component with the slug :slug already exists.', ['slug' => $slug]),
            ]);
        }

        $path = $this->pathFor($slug);

        if (File::exists($path)) {
            throw ValidationException::withMessages([
                'file' => __('A file already exists at :path. Remove it before uploading.', [
                    'path' => "resources/js/components/custom/{$slug}.tsx",
                ]),
            ]);
        }

        $directory = dirname($path);

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        // The file is written first so a failed row insert cannot leave a component
        // recorded but unrenderable; the file is removed again if the insert fails.
        File::put($path, $definition['tsx']);

        try {
            return DB::transaction(fn (): Component => Component::query()->create([
                'name' => $definition['information']['name'],
                'slug' => $slug,
                'type' => Component::TYPE_BLOCK,
                'status' => Component::STATUS_PUBLISHED,
                'can_delete' => $definition['information']['can_delete'],
                'unpub_shape' => $definition,
                'pub_shape' => $definition,
            ]));
        } catch (Throwable $exception) {
            File::delete($path);

            throw ValidationException::withMessages([
                'file' => __('Saving the component failed: :message', [
                    'message' => $exception->getMessage(),
                ]),
            ]);
        }
    }

    /**
     * @return array{creator: string, information: array<string, mixed>, properties: array<string, mixed>, tsx: string}
     *
     * @throws ValidationException
     */
    private function parse(string $yaml): array
    {
        try {
            $parsed = Yaml::parse($yaml);
        } catch (ParseException $exception) {
            // Symfony names the offending line, which is what an indentation slip in
            // the tsx block scalar needs in order to be findable.
            throw ValidationException::withMessages([
                'file' => __('The file is not valid YAML: :message', [
                    'message' => $exception->getMessage(),
                ]),
            ]);
        }

        try {
            return $this->shapes->normalize($parsed);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'file' => $exception->getMessage(),
            ]);
        }
    }

    private function pathFor(string $slug): string
    {
        return resource_path("js/components/custom/{$slug}.tsx");
    }
}
