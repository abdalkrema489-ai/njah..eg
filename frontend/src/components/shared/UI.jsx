// src/components/shared/UI.jsx — Professional Component Library v3
import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ══════════════════════════════════════════════════════
   Button / Btn
   ══════════════════════════════════════════════════════ */
export const Btn = forwardRef(function Btn(
  { children, variant = 'primary', size = 'md', loading, disabled,
    icon, rightIcon, style = {}, onClick, type, className = '', ...rest },
  ref
) {
  const sizes = {
    xs:   { padding: '5px 12px',  fontSize: 12, borderRadius: 8,  height: 30 },
    sm:   { padding: '7px 16px',  fontSize: 13, borderRadius: 9,  height: 36 },
    md:   { padding: '10px 22px', fontSize: 14, borderRadius: 10, height: 42 },
    lg:   { padding: '13px 28px', fontSize: 15, borderRadius: 12, height: 50 },
    icon: { width: 40, height: 40, padding: 0,  fontSize: 16, borderRadius: 10 },
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      borderColor: 'rgba(99,102,241,0.35)',
      color: '#fff',
      boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
    },
    secondary: {
      background: 'var(--surface2)',
      borderColor: 'var(--border2)',
      color: 'var(--text)',
      boxShadow: 'var(--shadow-xs)',
    },
    ghost: {
      background: 'transparent',
      borderColor: 'transparent',
      color: 'var(--text2)',
    },
    danger: {
      background: 'rgba(239,68,68,0.12)',
      borderColor: 'rgba(239,68,68,0.28)',
      color: 'var(--danger)',
    },
    success: {
      background: 'rgba(16,185,129,0.12)',
      borderColor: 'rgba(16,185,129,0.28)',
      color: 'var(--success)',
    },
    glass: {
      background: 'var(--glass)',
      borderColor: 'var(--border2)',
      color: 'var(--text)',
      backdropFilter: 'var(--glass-blur)',
      boxShadow: 'var(--shadow-sm)',
    },
    aurora: {
      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
      borderColor: 'rgba(99,102,241,0.35)',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    },
  };

  return (
    <motion.button
      ref={ref}
      whileHover={!disabled && !loading ? { scale: 1.035, y: -2, filter: 'brightness(1.08)' } : {}}
      whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
      disabled={disabled || loading}
      type={type || 'button'}
      className={className}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 7, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        border: '1px solid',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        transition: 'all 0.22s var(--ease)',
        ...(sizes[size] || sizes.md),
        ...(variants[variant] || variants.primary),
        ...style,
      }}
      {...rest}
    >
      {loading
        ? <div style={{
            width: 15, height: 15,
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: 'currentColor',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            flexShrink: 0,
          }}/>
        : icon ? <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span> : null
      }
      {children}
      {!loading && rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
    </motion.button>
  );
});

export const Button = Btn;

/* ══════════════════════════════════════════════════════
   Card
   ══════════════════════════════════════════════════════ */
export function Card({ children, hover = true, style = {}, onClick, className = '', noPad = false, glow = false, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`glass-panel ${className}`}
      style={{
        padding: noPad ? 0 : 24,
        cursor: onClick ? 'pointer' : 'default',
        ...(glow ? { boxShadow: 'var(--shadow-sm), var(--glow)' } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Input
   ══════════════════════════════════════════════════════ */
export const Input = forwardRef(function Input(
  { label, error, icon, rightIcon, onRightIconClick, hint, style = {}, className = '', required, ...props },
  ref
) {
  const paddingL = icon ? '44px' : '15px';
  const paddingR = rightIcon ? '44px' : '15px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} className={className}>
      {label && (
        <label style={{ fontSize: 12.5, color: 'var(--text2)', fontWeight: 600, display: 'flex', gap: 4 }}>
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 15, color: 'var(--text3)',
            pointerEvents: 'none', zIndex: 1,
            display: 'flex', alignItems: 'center',
          }}>
            {icon}
          </span>
        )}
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            style={{
              position: 'absolute', right: 13, top: '50%',
              transform: 'translateY(-50%)',
              border: 'none', background: 'none', padding: 4,
              fontSize: 15, color: 'var(--text3)',
              cursor: 'pointer', zIndex: 2,
              display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
              borderRadius: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            {rightIcon}
          </button>
        )}
        <input
          ref={ref}
          style={{
            width: '100%',
            padding: `11px ${paddingR} 11px ${paddingL}`,
            borderColor: error ? 'var(--danger)' : undefined,
            boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.12)' : undefined,
            ...style,
          }}
          {...props}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            ⚠ {error}
          </motion.span>
        )}
      </AnimatePresence>
      {hint && !error && <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{hint}</span>}
    </div>
  );
});

/* ══════════════════════════════════════════════════════
   Textarea
   ══════════════════════════════════════════════════════ */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, rows = 4, style = {}, ...props }, ref
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12.5, color: 'var(--text2)', fontWeight: 600 }}>{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        style={{
          resize: 'vertical',
          lineHeight: 1.6,
          borderColor: error ? 'var(--danger)' : undefined,
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 600 }}>⚠ {error}</span>}
      {hint && !error && <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{hint}</span>}
    </div>
  );
});

/* ══════════════════════════════════════════════════════
   Select
   ══════════════════════════════════════════════════════ */
export const Select = forwardRef(function Select(
  { label, children, style = {}, error, ...props }, ref
) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12.5, color: 'var(--text2)', fontWeight: 600 }}>{label}</label>}
      <select
        ref={ref}
        style={{ width: '100%', ...style }}
        {...props}
      >
        {children}
      </select>
      {error && <span style={{ fontSize: 11.5, color: 'var(--danger)', fontWeight: 600 }}>⚠ {error}</span>}
    </div>
  );
});

/* ══════════════════════════════════════════════════════
   Modal
   ══════════════════════════════════════════════════════ */
export function Modal({ open, onClose, title, children, size = 'md', icon }) {
  const widths = { sm: 400, md: 540, lg: 740, xl: 960, full: '96vw' };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => e.target === e.currentTarget && onClose?.()}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(3,3,8,0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              borderRadius: 'var(--radius-xl)',
              width: typeof widths[size] === 'number' ? widths[size] : widths[size],
              maxWidth: '100%', maxHeight: '92vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-xl), var(--glow-md)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
                <div style={{
                  fontWeight: 800, fontSize: 17,
                  fontFamily: 'var(--font-head)',
                  letterSpacing: '-0.025em',
                  color: 'var(--text)',
                }}>
                  {title}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={onClose}
                style={{
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  borderRadius: 9, color: 'var(--text2)', fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >
                ✕
              </motion.button>
            </div>
            {/* Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }} className="scroll-y">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════
   Spinner
   ══════════════════════════════════════════════════════ */
export function Spinner({ size = 'md', color = 'var(--primary-light)' }) {
  const s = size === 'sm' ? 18 : size === 'lg' ? 52 : 28;
  const t = size === 'sm' ? 2 : size === 'lg' ? 3.5 : 3;
  return (
    <div style={{
      width: s, height: s,
      border: `${t}px solid rgba(255,255,255,0.08)`,
      borderTopColor: color,
      borderRightColor: color + '80',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
      flexShrink: 0,
      display: 'inline-block',
    }}/>
  );
}

/* ══════════════════════════════════════════════════════
   ProgressBar
   ══════════════════════════════════════════════════════ */
export function ProgressBar({ value, max = 100, color = 'var(--primary)', height = 8, label, showPercent = false }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const colorMap = {
    primary: 'linear-gradient(90deg, var(--brand-600), var(--primary-light))',
    success: 'linear-gradient(90deg, #059669, #10B981)',
    warning: 'linear-gradient(90deg, #D97706, #F59E0B)',
    danger:  'linear-gradient(90deg, #DC2626, #EF4444)',
    cyan:    'linear-gradient(90deg, #0891B2, #06B6D4)',
  };
  const bgGrad = colorMap[color] || color;

  return (
    <div>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{label}</span>}
          {showPercent && <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{pct}%</span>}
        </div>
      )}
      <div style={{
        height, background: 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: height / 2,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.45)',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: height / 2,
            background: bgGrad,
            boxShadow: `0 0 8px ${typeof color === 'string' && color.startsWith('var') ? 'rgba(124,58,237,0.4)' : color + '60'}`,
          }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Avatar
   ══════════════════════════════════════════════════════ */
export function Avatar({ src, name, size = 40, ring = false }) {
  const safeName = typeof name === 'string' ? name : '';
  const initials = safeName
    ? safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'N';

  const inner = src
    ? <img
        src={String(src)} alt={safeName}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    : <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 800, color: '#fff', userSelect: 'none',
        fontFamily: 'var(--font-head)',
      }}>
        {initials}
      </div>;

  if (!ring) return inner;
  return (
    <div style={{
      borderRadius: '50%',
      padding: 2,
      background: 'linear-gradient(135deg, var(--primary), var(--accent-cyan))',
      display: 'inline-flex',
    }}>
      {inner}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   EmptyState
   ══════════════════════════════════════════════════════ */
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel"
      style={{ textAlign: 'center', padding: '64px 32px' }}
    >
      <div style={{ fontSize: 56, marginBottom: 18, display: 'inline-block', animation: 'float 6s ease-in-out infinite' }}>
        {icon}
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800,
        fontFamily: 'var(--font-head)',
        color: 'var(--text)',
        marginBottom: 8,
        letterSpacing: '-0.02em',
      }}>
        {title}
      </div>
      {subtitle && (
        <p style={{
          fontSize: 14, marginBottom: 28, lineHeight: 1.65,
          maxWidth: 380, margin: '0 auto 28px',
          color: 'var(--text2)',
        }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 24 }}>{action}</div>}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   Tabs
   ══════════════════════════════════════════════════════ */
export function Tabs({ tabs, active, onChange, size = 'md' }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 4, flexWrap: 'wrap',
      background: 'var(--surface)',
      backdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: 5, marginBottom: 24,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <motion.button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: size === 'sm' ? '6px 14px' : '8px 18px',
              borderRadius: 8,
              fontSize: size === 'sm' ? 12.5 : 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'var(--font-body)',
              background: isActive
                ? 'linear-gradient(135deg, var(--primary), var(--brand-600))'
                : 'transparent',
              color: isActive ? '#fff' : 'var(--text2)',
              boxShadow: isActive ? 'var(--glow)' : 'none',
              transition: 'all 0.22s var(--ease)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.icon && <span style={{ fontSize: size === 'sm' ? 13 : 15 }}>{tab.icon}</span>}
            {tab.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   StatCard
   ══════════════════════════════════════════════════════ */
export function StatCard({ icon, value, label, change, color = '#7C3AED', onClick, trend, sub }) {
  const safeColor = String(color || '#7C3AED');
  const isPositive = typeof change === 'string' && (change.startsWith('+') || change.includes('%'));

  return (
    <Card hover onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          background: `color-mix(in srgb, ${safeColor} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${safeColor} 25%, transparent)`,
          boxShadow: `0 0 18px color-mix(in srgb, ${safeColor} 20%, transparent)`,
        }}>
          {icon}
        </div>
        {change && (
          <span style={{
            fontSize: 11.5, fontWeight: 700, padding: '4px 10px',
            borderRadius: 20,
            background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isPositive ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {isPositive ? '▲' : '▼'} {String(change)}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 30, fontWeight: 800,
        fontFamily: 'var(--font-head)',
        letterSpacing: '-0.03em',
        color: 'var(--text)',
        marginBottom: 4,
        lineHeight: 1,
      }}>
        {String(value ?? '')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════
   Tag
   ══════════════════════════════════════════════════════ */
export function Tag({ children, color = 'primary', onRemove }) {
  const colors = {
    primary: '#7C3AED',
    blue:    '#3B82F6',
    green:   '#10B981',
    amber:   '#F59E0B',
    red:     '#EF4444',
    cyan:    '#06B6D4',
    pink:    '#EC4899',
  };
  const C = colors[color] || colors.primary;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 11px', borderRadius: 99,
      fontSize: 12, fontWeight: 600,
      background: `color-mix(in srgb, ${C} 14%, transparent)`,
      color: C,
      border: `1px solid color-mix(in srgb, ${C} 28%, transparent)`,
    }}>
      {typeof children === 'string' || typeof children === 'number' ? children : String(children ?? '')}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            fontSize: 9, opacity: 0.7, background: 'rgba(0,0,0,0.2)',
            width: 16, height: 16, borderRadius: '50%', border: 'none',
            cursor: 'pointer', color: 'inherit', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
        >
          ✕
        </button>
      )}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   SectionHeader
   ══════════════════════════════════════════════════════ */
export function SectionHeader({ icon, title, subtitle, action, gradient = false }) {
  const hash = String(title).split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
  const imgIdx = (Math.abs(hash) % 30) + 1;

  return (
    <div style={{
      position: 'relative',
      padding: '36px 40px',
      borderRadius: 24,
      marginBottom: 32,
      overflow: 'hidden',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      flexWrap: 'wrap', gap: 14,
      boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
      border: '1px solid var(--border)'
    }}>
      <img src={`/images/showcase-${imgIdx}.jpeg`} alt="header-bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, pointerEvents: 'none', mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--surface) 20%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, var(--surface) 0%, transparent 100%)', pointerEvents: 'none', opacity: 0.6 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: 28, fontWeight: 800,
          fontFamily: 'var(--font-head)',
          letterSpacing: '-0.03em',
          marginBottom: subtitle ? 8 : 0,
          display: 'flex', alignItems: 'center', gap: 12,
          ...(gradient ? {
            background: 'linear-gradient(135deg, #fff 30%, var(--primary-light) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          } : { color: 'var(--text)' }),
        }}>
          {icon && <span style={{ fontSize: 32, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>{icon}</span>}
          {String(title || 'Untitled')}
        </h2>
        {subtitle && (
          <p style={{ color: 'var(--text2)', fontSize: 14.5, maxWidth: 560, lineHeight: 1.6, fontWeight: 500 }}>
            {String(subtitle)}
          </p>
        )}
      </div>
      {action && <div style={{ position: 'relative', zIndex: 1 }}>{action}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ConfirmModal
   ══════════════════════════════════════════════════════ */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm Action'} size="sm" icon={danger ? '⚠️' : '❓'}>
      <p style={{ color: 'var(--text2)', fontSize: 14.5, lineHeight: 1.65, marginBottom: 28 }}>
        {String(message || 'Are you sure?')}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm?.(); onClose?.(); }}>
          {String(confirmLabel)}
        </Btn>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   Tooltip
   ══════════════════════════════════════════════════════ */
export function Tooltip({ children, content, placement = 'top' }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && content && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'top' ? 6 : -6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              [placement === 'top' ? 'bottom' : 'top']: 'calc(100% + 8px)',
              left: '50%', transform: 'translateX(-50%)',
              background: 'var(--surface4)',
              color: 'var(--text)',
              fontSize: 11.5, fontWeight: 600,
              padding: '5px 10px', borderRadius: 8,
              whiteSpace: 'nowrap',
              border: '1px solid var(--border2)',
              boxShadow: 'var(--shadow)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Divider
   ══════════════════════════════════════════════════════ */
export function Divider({ label, margin = 24 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: `${margin}px 0` }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--border))' }}/>
      {label && (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text3)', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border), transparent)' }}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Alert / Banner
   ══════════════════════════════════════════════════════ */
export function Alert({ type = 'info', icon, title, message, onClose }) {
  const types = {
    info:    { color: 'var(--accent-blue)',    bg: 'rgba(59,130,246,0.09)',  border: 'rgba(59,130,246,0.22)'  },
    success: { color: 'var(--success)',         bg: 'rgba(16,185,129,0.09)', border: 'rgba(16,185,129,0.22)' },
    warning: { color: 'var(--warning)',         bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.22)' },
    danger:  { color: 'var(--danger)',          bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.22)'  },
  };
  const t = types[type] || types.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        padding: '14px 16px',
        background: t.bg, border: `1px solid ${t.border}`,
        borderRadius: 12, color: t.color,
      }}
    >
      {icon && <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{title}</div>}
        {message && <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{message}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} style={{ fontSize: 14, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}>✕</button>
      )}
    </motion.div>
  );
}
/* ══════════════════════════════════════════════════════
   StarRating — Teacher rating widget (interactive + read-only)
   Usage:
     <StarRating value={3} onChange={setRating} />          ← interactive
     <StarRating value={4.2} readonly size={16} />           ← display-only
   ══════════════════════════════════════════════════════ */
export function StarRating({ value = 0, onChange, readonly = false, size = 22, count = 5 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div
      role={readonly ? 'img' : 'group'}
      aria-label={`Rating: ${value} out of ${count}`}
      style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}
    >
      {Array.from({ length: count }, (_, i) => i + 1).map(star => {
        const filled = star <= Math.round(display);
        return (
          <motion.button
            key={star}
            type="button"
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            whileHover={!readonly ? { scale: 1.25, rotate: -5 } : {}}
            whileTap={!readonly ? { scale: 0.9 } : {}}
            title={readonly ? undefined : `Rate ${star} star${star > 1 ? 's' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: readonly ? 'default' : 'pointer',
              padding: 2,
              fontSize: size,
              lineHeight: 1,
              color: filled ? '#FBBF24' : 'var(--border2)',
              textShadow: filled ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
              transition: 'color 0.15s, text-shadow 0.15s',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            ★
          </motion.button>
        );
      })}
      {readonly && value > 0 && (
        <span style={{ fontSize: size * 0.6, color: 'var(--text3)', marginInlineStart: 4, fontWeight: 600 }}>
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Skeleton — shimmer placeholder components
   All shapes are pure CSS (global.css @keyframes shimmer)
   ══════════════════════════════════════════════════════ */

/**
 * Base skeleton bone.
 * @param {string} className  - additional shape class e.g. 'skeleton-text'
 * @param {object} style      - inline overrides (width, height, etc.)
 */
export function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** A single line of placeholder text */
Skeleton.Text = function SkeletonText({ width = '100%', style = {} }) {
  return <div className="skeleton skeleton-text" style={{ width, ...style }} aria-hidden="true" />;
};

/** Multi-line text block */
Skeleton.Paragraph = function SkeletonParagraph({ lines = 3, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
};

/** Circle avatar placeholder */
Skeleton.Avatar = function SkeletonAvatar({ size = 44, style = {} }) {
  return (
    <div
      className="skeleton skeleton-avatar"
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    />
  );
};

/** Rounded badge / chip */
Skeleton.Badge = function SkeletonBadge({ width = 72, style = {} }) {
  return <div className="skeleton skeleton-badge" style={{ width, ...style }} aria-hidden="true" />;
};

/** Button-shaped bone */
Skeleton.Button = function SkeletonButton({ width = 100, style = {} }) {
  return <div className="skeleton skeleton-btn" style={{ width, ...style }} aria-hidden="true" />;
};

/** Card with inner content rows */
Skeleton.Card = function SkeletonCard({ rows = 3, showAvatar = false, style = {} }) {
  return (
    <div className="skeleton-card" style={style} aria-hidden="true">
      {showAvatar && (
        <div className="skeleton-row">
          <Skeleton.Avatar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton.Text width="55%" />
            <Skeleton.Text width="35%" />
          </div>
        </div>
      )}
      <Skeleton.Paragraph lines={rows} />
      <div className="skeleton-row" style={{ marginTop: 4 }}>
        <Skeleton.Badge />
        <Skeleton.Badge width={55} />
        <div style={{ flex: 1 }} />
        <Skeleton.Button width={88} />
      </div>
    </div>
  );
};

/** Tall block (image / video / chart placeholder) */
Skeleton.Block = function SkeletonBlock({ height = 140, style = {} }) {
  return <div className="skeleton skeleton-block" style={{ height, ...style }} aria-hidden="true" />;
};

/** Full page grid of skeleton cards */
Skeleton.Grid = function SkeletonGrid({ count = 6, cols = 3, rows = 3, showAvatar = false, style = {} }) {
  return (
    <div
      className={`skeleton-grid skeleton-grid-${cols}`}
      style={style}
      aria-busy="true"
      aria-label="Loading…"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Card key={i} rows={rows} showAvatar={showAvatar} />
      ))}
    </div>
  );
};

/** Page-level header skeleton (title + subtitle + action btn) */
Skeleton.Header = function SkeletonHeader({ style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, ...style }} aria-hidden="true">
      <div style={{ flex: 1 }}>
        <Skeleton.Text width="38%" style={{ height: 26, marginBottom: 10 }} />
        <Skeleton.Text width="55%" />
      </div>
      <Skeleton.Button width={120} style={{ height: 42 }} />
    </div>
  );
};

/** Note-card shaped skeleton */
Skeleton.Note = function SkeletonNote({ style = {} }) {
  return (
    <div className="skeleton-card" style={{ gap: 10, ...style }} aria-hidden="true">
      <Skeleton.Text width="50%" style={{ height: 18, marginBottom: 4 }} />
      <div className="skeleton skeleton-note" />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton.Badge />
        <Skeleton.Badge width={52} />
      </div>
    </div>
  );
};

/** Chat message skeleton (alternating left/right) */
Skeleton.Message = function SkeletonMessage({ align = 'left', style = {} }) {
  const isRight = align === 'right';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isRight ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
        ...style,
      }}
      aria-hidden="true"
    >
      {!isRight && <Skeleton.Avatar size={34} />}
      <div style={{ maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          className="skeleton"
          style={{
            height: 38,
            width: 180 + Math.random() * 80,
            borderRadius: isRight ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          }}
        />
      </div>
    </div>
  );
};
