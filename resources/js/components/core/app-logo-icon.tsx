import { Sparkles } from 'lucide-react';
import type { ComponentProps } from 'react';

/**
 * The Ciian mark.
 *
 * Sparkles matches the icon seeded onto `ciian_config`, so the sidebar logo and
 * the Ciian tag badge on Systems and Tables read as the same brand. It is drawn
 * with strokes rather than fills, so callers colour it with `text-*` and must
 * not pass `fill-current` — that would flood the outline into a solid blob.
 */
export default function AppLogoIcon(props: ComponentProps<typeof Sparkles>) {
    return <Sparkles {...props} />;
}
