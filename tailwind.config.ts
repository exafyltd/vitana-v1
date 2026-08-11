import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

// CJK fallback families (VTID-03569).
//
// CSS font fallback is PER CHARACTER, not per element: the browser walks the
// stack for each glyph and uses the first family that has it. So appending
// these costs a non-Chinese user exactly nothing — no download, no request,
// never consulted — while giving a Chinese user a KNOWN face instead of
// whatever the generic `sans-serif`/`serif` keyword happens to resolve to on
// their device.
//
// Deliberately system fonts and NOT a webfont: a subsetted CJK webfont is
// still 5-15 MB because the character set is ~7,000 glyphs, against ~800 KB
// for this entire i18n catalog. Every platform already ships a good Simplified
// face; the job is to NAME it, not to send one.
//
// Ordered macOS/iOS → Windows → Android/Linux.
const CJK_SANS = ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC'];
const CJK_SERIF = ['Songti SC', 'SimSun', 'Noto Serif CJK SC', 'Noto Serif SC'];

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		screens: {
			'sm': '640px',
			'md': '1024px',
			'lg': '1280px',
			'xl': '1536px',
			'2xl': '1600px',
		},
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				// Cormorant has NO CJK glyphs, and neither does Georgia. Without a
				// named CJK serif here every Chinese heading fell through to the
				// bare `serif` keyword — which resolves per-device and is the one
				// place tofu was actually plausible.
				'editorial': ['Cormorant', 'Georgia', ...CJK_SERIF, 'serif'],
				// The base stack was never overridden, so it was Tailwind's default.
				// Spreading that default rather than retyping it keeps this in step
				// with Tailwind instead of silently freezing an old list.
				sans: [...defaultTheme.fontFamily.sans, ...CJK_SANS],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				ruby: 'hsl(var(--ruby))',
				calendar: {
					primary: 'hsl(var(--calendar-primary))',
					'primary-light': 'hsl(var(--calendar-primary-light))',
					secondary: 'hsl(var(--calendar-secondary))',
					accent: 'hsl(var(--calendar-accent))',
					success: 'hsl(var(--calendar-success))',
					background: 'hsl(var(--calendar-background))',
					card: 'hsl(var(--calendar-card))'
				},
				/* Vitana Pillar-First Color System */
				pill: {
					nutrition: {
						accent: 'hsl(var(--pill-nutrition-accent))',
						tint: 'hsl(var(--pill-nutrition-tint))'
					},
					hydration: {
						accent: 'hsl(var(--pill-hydration-accent))',
						tint: 'hsl(var(--pill-hydration-tint))'
					},
					mental: {
						accent: 'hsl(var(--pill-mental-accent))',
						tint: 'hsl(var(--pill-mental-tint))'
					},
					exercise: {
						accent: 'hsl(var(--pill-exercise-accent))',
						tint: 'hsl(var(--pill-exercise-tint))'
					},
					sleep: {
						accent: 'hsl(var(--pill-sleep-accent))',
						tint: 'hsl(var(--pill-sleep-tint))'
					}
				},
				sys: {
					vitana: {
						accent: 'hsl(var(--sys-vitana-accent))',
						tint: 'hsl(var(--sys-vitana-tint))',
						card: 'hsl(var(--sys-vitana-card))',
						'card-border': 'hsl(var(--sys-vitana-card-border))'
					},
					autopilot: {
						accent: 'hsl(var(--sys-autopilot-accent))',
						tint: 'hsl(var(--sys-autopilot-tint))'
					},
					ai: {
						accent: 'hsl(var(--sys-ai-accent))',
						tint: 'hsl(var(--sys-ai-tint))'
					},
					feature: {
						new: {
							accent: 'hsl(var(--sys-feature-new-accent))',
							tint: 'hsl(var(--sys-feature-new-tint))',
							card: 'hsl(var(--sys-feature-new-card))',
							'card-border': 'hsl(var(--sys-feature-new-card-border))'
						},
						tip: {
							accent: 'hsl(var(--sys-feature-tip-accent))',
							tint: 'hsl(var(--sys-feature-tip-tint))',
							card: 'hsl(var(--sys-feature-tip-card))',
							'card-border': 'hsl(var(--sys-feature-tip-card-border))'
						}
					}
				},
				util: {
					calendar: {
						accent: 'hsl(var(--util-calendar-accent))',
						tint: 'hsl(var(--util-calendar-tint))'
					},
					settings: {
						accent: 'hsl(var(--util-settings-accent))',
						tint: 'hsl(var(--util-settings-tint))'
					},
					profile: {
						accent: 'hsl(var(--util-profile-accent))',
						tint: 'hsl(var(--util-profile-tint))'
					}
				},
				domain: {
					discover: {
						accent: 'hsl(var(--domain-discover-accent))',
						tint: 'hsl(var(--domain-discover-tint))'
					},
					health: {
						accent: 'hsl(var(--domain-health-accent))',
						tint: 'hsl(var(--domain-health-tint))'
					},
					tracker: {
						accent: 'hsl(var(--domain-tracker-accent))',
						tint: 'hsl(var(--domain-tracker-tint))'
					},
					messages: {
						accent: 'hsl(var(--domain-messages-accent))',
						tint: 'hsl(var(--domain-messages-tint))',
						bubble: 'hsl(var(--domain-messages-bubble))',
						'bubble-foreground': 'hsl(var(--domain-messages-bubble-foreground))'
					},
					community: {
						accent: 'hsl(var(--domain-community-accent))',
						tint: 'hsl(var(--domain-community-tint))'
					}
				},
				/* Action Button Gradients */
				gradient: {
					join: {
						start: 'hsl(var(--gradient-join-start))',
						end: 'hsl(var(--gradient-join-end))'
					},
					follow: {
						start: 'hsl(var(--gradient-follow-start))',
						end: 'hsl(var(--gradient-follow-end))'
					},
					play: {
						start: 'hsl(var(--gradient-play-start))',
						end: 'hsl(var(--gradient-play-end))'
					},
					disabled: {
						start: 'hsl(var(--gradient-disabled-start))',
						end: 'hsl(var(--gradient-disabled-end))'
					}
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'scroll': {
					'0%': {
						transform: 'translateX(0)'
					},
					'100%': {
						transform: 'translateX(-50%)'
					}
				},
				'fade-in-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'gradient-x': {
					'0%, 100%': {
						'background-position': '0% 50%'
					},
					'50%': {
						'background-position': '100% 50%'
					}
				},
				'shimmer': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(100%)'
					}
				},
				'wave': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(5deg)' },
					'75%': { transform: 'rotate(-5deg)' }
				},
				'fadeIn': {
					'0%': { opacity: '0', transform: 'translateY(-10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'scroll-slow': 'scroll 60s linear infinite',
				'scroll-medium': 'scroll 40s linear infinite',
				'scroll-fast': 'scroll 20s linear infinite',
				'fade-in-up': 'fade-in-up 0.5s ease-out',
				'gradient-x': 'gradient-x 3s ease infinite',
				'shimmer': 'shimmer 2s ease-in-out infinite'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }: any) {
			addUtilities({
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',
					'&::-webkit-scrollbar': {
						display: 'none'
					}
				},
				'.perspective-1000': {
					perspective: '1000px',
					'transform-style': 'preserve-3d'
				}
			})
		}
	],
} satisfies Config;
