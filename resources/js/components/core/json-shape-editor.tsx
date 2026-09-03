import Editor from '@monaco-editor/react';
import type { OnChange, OnMount } from '@monaco-editor/react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

type Props = {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    className?: string;
    height?: string | number;
};

export default function JsonShapeEditor({
    value,
    onChange,
    readOnly = false,
    className,
    height = '100%',
}: Props) {
    const { resolvedAppearance } = useAppearance();

    const handleChange: OnChange = (next) => {
        onChange?.(next ?? '');
    };

    const handleMount: OnMount = (editor) => {
        editor.updateOptions({
            readOnly,
        });
    };

    return (
        <div className={cn('min-h-0 flex-1 overflow-hidden', className)}>
            <Editor
                height={height}
                language="json"
                theme={resolvedAppearance === 'dark' ? 'vs-dark' : 'light'}
                value={value}
                onChange={handleChange}
                onMount={handleMount}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 12,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    folding: true,
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 12, bottom: 12 },
                    renderLineHighlight: readOnly ? 'none' : 'line',
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                    },
                }}
            />
        </div>
    );
}
