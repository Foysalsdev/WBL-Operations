/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Notion exact palette
        notion: {
          // Page backgrounds
          bg:        '#FFFFFF',
          'bg-warm': '#F7F7F5',    // sidebar, secondary bg
          'bg-hover':'rgba(55,53,47,0.06)', // hover state
          'bg-active':'rgba(55,53,47,0.10)',

          // Text
          text:      '#37352F',    // Notion default text
          'text-2':  'rgba(55,53,47,0.65)', // secondary
          'text-3':  'rgba(55,53,47,0.40)', // tertiary / placeholders
          'text-inv':'#FFFFFF',

          // Borders
          border:    'rgba(55,53,47,0.09)',
          'border-strong': 'rgba(55,53,47,0.16)',

          // Accent (Notion blue)
          blue:      '#2383E2',
          'blue-bg': 'rgba(35,131,226,0.07)',
          'blue-light': '#E7F3FB',

          // Status colors (Notion tag style)
          'green':      '#0F7B6C',
          'green-bg':   '#DDEDEA',
          'red':        '#E03E3E',
          'red-bg':     '#FDDEDE',
          'yellow':     '#DFAB01',
          'yellow-bg':  '#FBF3DB',
          'purple':     '#6940A5',
          'purple-bg':  '#EAE4F2',
          'gray':       'rgba(55,53,47,0.4)',
          'gray-bg':    'rgba(55,53,47,0.06)',
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          '"Apple Color Emoji"',
          'Arial',
          'sans-serif',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
        mono: [
          '"SFMono-Regular"',
          'Menlo',
          'Consolas',
          '"PT Mono"',
          '"Liberation Mono"',
          'Courier',
          'monospace',
        ],
      },
      fontSize: {
        'xs':  ['11px', { lineHeight: '1.4' }],
        'sm':  ['13px', { lineHeight: '1.5' }],
        'base':['14px', { lineHeight: '1.5' }],
        'md':  ['15px', { lineHeight: '1.5' }],
        'lg':  ['16px', { lineHeight: '1.4' }],
        'xl':  ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['28px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'sm': '3px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '10px',
        'full': '9999px',
      },
      boxShadow: {
        'notion': '0 0 0 1px rgba(55,53,47,0.09)',
        'notion-md': '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(55,53,47,0.09)',
        'notion-lg': '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(55,53,47,0.09)',
        'notion-modal': 'rgba(15,15,15,0.05) 0px 0px 0px 1px, rgba(15,15,15,0.1) 0px 3px 6px, rgba(15,15,15,0.2) 0px 9px 24px',
        'none': 'none',
      },
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '1.5': '6px',
        '2':   '8px',
        '2.5': '10px',
        '3':   '12px',
        '3.5': '14px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '7':   '28px',
        '8':   '32px',
        '10':  '40px',
        '12':  '48px',
        '14':  '56px',
        '16':  '64px',
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
    },
  },
  plugins: [],
}
