// client/src/components/RichTextEditor.tsx
import React, { useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Start writing...' }: RichTextEditorProps) {
    // Image handler for uploading images
    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                // Convert to base64 for now (can be replaced with server upload)
                const reader = new FileReader();
                reader.onload = () => {
                    // Get the Quill editor instance from the DOM
                    const quillEditor = document.querySelector('.ql-editor');
                    if (quillEditor) {
                        // Insert image at cursor or end
                        const img = document.createElement('img');
                        img.src = reader.result as string;
                        img.style.maxWidth = '100%';
                        img.style.height = 'auto';
                        img.style.borderRadius = '0.5rem';
                        img.style.margin = '1rem 0';

                        // For simplicity, append to editor (Quill will handle it)
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.insertNode(img);
                        } else {
                            quillEditor.appendChild(img);
                        }

                        // Trigger onChange with new content
                        const htmlContent = quillEditor.innerHTML;
                        onChange(htmlContent);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    }, [onChange]);

    // Quill modules configuration
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                // Formatting
                ['bold', 'italic', 'underline', 'strike'],
                // Highlights and colors
                [{ 'background': [] }, { 'color': [] }],
                // Alignment
                [{ 'align': [] }],
                // Headings
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                // Lists
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                // Indentation
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                // Links and images
                ['link', 'image'],
                // Clear formatting
                ['clean'],
            ],
            handlers: {
                image: imageHandler,
            },
        },
        clipboard: {
            matchVisual: false,
        },
    }), [imageHandler]);

    // Allowed formats
    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'background', 'color',
        'align',
        'list', 'bullet', 'indent',
        'link', 'image',
    ];

    return (
        <div className="rich-text-editor">
            {/* @ts-ignore - React-Quill types are not compatible with React 18 */}
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
            />
            <style>{`
        .rich-text-editor .ql-container {
          min-height: 400px;
          font-size: 16px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f9fafb;
          flex-wrap: wrap;
        }
        .rich-text-editor .ql-editor {
          min-height: 380px;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-text-editor .ql-editor p {
          margin-bottom: 0.75rem;
        }
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
      `}</style>
        </div>
    );
}

export default RichTextEditor;
