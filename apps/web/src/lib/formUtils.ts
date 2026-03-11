/**
 * Helper class for consistent input styling with error states.
 */
export function inputClass(hasError = false): string {
  return [
    'w-full h-10 px-3 text-sm rounded-md border transition-colors',
    'placeholder:text-neutral-400 text-neutral-900 bg-white',
    hasError
      ? 'border-danger-400 ring-1 ring-danger-400/30 focus:border-danger-500 focus:ring-danger-500/30'
      : 'border-neutral-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
    'outline-none',
  ].join(' ');
}

/**
 * Helper class for consistent textarea styling.
 */
export function textareaClass(hasError = false): string {
  return inputClass(hasError).replace('h-10', 'min-h-[100px] py-2.5 resize-y');
}
