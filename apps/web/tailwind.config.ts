import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    borderRadius: {
      DEFAULT: '0px',
      'none': '0px',
      'sm': 'var(--radius-sm)',
      'md': 'var(--radius-md)',
      'lg': 'var(--radius-lg)',
      'xl': 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      '3xl': 'var(--radius-3xl)',
      'full': 'var(--radius-full)',
    },
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        /* Industrial accent — azul de dados, visível sobre fundo branco */
        industrial: {
          text: '#1a1a1a',
          bg: '#fafafa',
          border: '#e5e5e5',
          hover: '#f5f5f5',
          accent: '#1d4ed8',
          muted: '#737373',
        },
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
        },
        danger: {
          50: 'var(--color-danger-50)',
          100: 'var(--color-danger-100)',
          200: 'var(--color-danger-200)',
          500: 'var(--color-danger-500)',
          600: 'var(--color-danger-600)',
          700: 'var(--color-danger-700)',
          800: 'var(--color-danger-800)',
        },
        neutral: {
          0: 'var(--color-neutral-0)',
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        estado: {
          pendente: {
            bg: 'var(--estado-pendente-bg)',
            text: 'var(--estado-pendente-text)',
            border: 'var(--estado-pendente-border)',
            dot: 'var(--estado-pendente-dot)',
          },
          confirmado: {
            bg: 'var(--estado-confirmado-bg)',
            text: 'var(--estado-confirmado-text)',
            border: 'var(--estado-confirmado-border)',
            dot: 'var(--estado-confirmado-dot)',
          },
          progres: {
            bg: 'var(--estado-em-progresso-bg)',
            text: 'var(--estado-em-progresso-text)',
            border: 'var(--estado-em-progresso-border)',
            dot: 'var(--estado-em-progresso-dot)',
          },
          concluido: {
            bg: 'var(--estado-concluido-bg)',
            text: 'var(--estado-concluido-text)',
            border: 'var(--estado-concluido-border)',
            dot: 'var(--estado-concluido-dot)',
          },
          cancelado: {
            bg: 'var(--estado-cancelado-bg)',
            text: 'var(--estado-cancelado-text)',
            border: 'var(--estado-cancelado-border)',
            dot: 'var(--estado-cancelado-dot)',
          },
        },
        urgencia: {
          normal: {
            bg: 'var(--urgencia-normal-bg)',
            text: 'var(--urgencia-normal-text)',
            border: 'var(--urgencia-normal-border)',
          },
          urgente: {
            bg: 'var(--urgencia-urgente-bg)',
            text: 'var(--urgencia-urgente-text)',
            border: 'var(--urgencia-urgente-border)',
          },
          muito: {
            bg: 'var(--urgencia-muito-urgente-bg)',
            text: 'var(--urgencia-muito-urgente-text)',
            border: 'var(--urgencia-muito-urgente-border)',
          },
        },
        sa: {
          background: 'var(--sa-background)',
          surface: 'var(--sa-surface)',
          primary: 'var(--sa-primary)',
          border: 'var(--sa-border)',
          destructive: 'var(--sa-destructive)',
          text: 'var(--sa-text)',
          muted: 'var(--sa-text-muted)',
        }
      },
      maxWidth: {
        'page': 'var(--page-max-width)',
      },
      spacing: {
        'page-x': 'var(--page-padding-x)',
        'page-y': 'var(--page-padding-y)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'premium': 'var(--shadow-premium)',
        'glass': 'var(--shadow-glass)',
        'modal': 'var(--shadow-modal)',
        'focus': 'var(--shadow-focus)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "zoom-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        "zoom-out": "zoom-out 0.2s ease-out",
        "slide-in-from-top": "slide-in-from-top 0.2s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
