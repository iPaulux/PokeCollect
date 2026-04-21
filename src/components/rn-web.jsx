/**
 * Shims React Native → DOM.
 * Les screens importent depuis ici au lieu de 'react-native'.
 * API volontairement limitée aux composants utilisés dans l'appli.
 */
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// ─── StyleSheet ──────────────────────────────────────────────────────────────
export const StyleSheet = { create: (s) => s };

// ─── Helpers style ───────────────────────────────────────────────────────────
// React Native: View est flex column par défaut
function viewBase(style) {
  return {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    ...style,
  };
}

// ─── View ────────────────────────────────────────────────────────────────────
export function View({ style, children, onStartShouldSetResponder, ...rest }) {
  return (
    <div style={viewBase(style)} {...rest}>
      {children}
    </div>
  );
}

// ─── Text ────────────────────────────────────────────────────────────────────
export function Text({ style, numberOfLines, children, ...rest }) {
  const clamp = numberOfLines
    ? {
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: numberOfLines,
        WebkitBoxOrient: 'vertical',
        wordBreak: 'break-all',
      }
    : {};
  return (
    <span style={{ fontFamily: 'Poppins, sans-serif', ...clamp, ...style }} {...rest}>
      {children}
    </span>
  );
}

// ─── TouchableOpacity ────────────────────────────────────────────────────────
export function TouchableOpacity({
  style,
  onPress,
  onLongPress,
  activeOpacity = 0.7,
  children,
  hitSlop,
  disabled,
  ...rest
}) {
  const timerRef = useRef(null);

  const startLong = () => {
    if (onLongPress) timerRef.current = setTimeout(onLongPress, 500);
  };
  const cancelLong = () => clearTimeout(timerRef.current);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        ...style,
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={disabled ? undefined : onPress}
      onMouseDown={startLong}
      onMouseUp={cancelLong}
      onMouseLeave={cancelLong}
      onTouchStart={startLong}
      onTouchEnd={cancelLong}
      onTouchCancel={cancelLong}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress?.(); }
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─── Image ───────────────────────────────────────────────────────────────────
const RESIZE_MAP = { contain: 'contain', cover: 'cover', stretch: 'fill', center: 'none' };

export function Image({ source, style, resizeMode = 'cover', alt = '', ...rest }) {
  const src = typeof source === 'string' ? source : source?.uri;
  return (
    <img
      src={src}
      alt={alt}
      style={{ objectFit: RESIZE_MAP[resizeMode] ?? 'cover', display: 'block', ...style }}
      {...rest}
    />
  );
}

// ─── TextInput ───────────────────────────────────────────────────────────────
export function TextInput({
  style,
  placeholder,
  placeholderTextColor,
  value,
  onChangeText,
  autoFocus,
  onSubmitEditing,
  returnKeyType,
  keyboardType,
  multiline,
  secureTextEntry,
  ...rest
}) {
  const inputStyle = {
    background: 'none',
    border: 'none',
    outline: 'none',
    color: 'inherit',
    fontFamily: 'Poppins, sans-serif',
    fontSize: 'inherit',
    boxSizing: 'border-box',
    ...style,
  };

  const type = secureTextEntry
    ? 'password'
    : keyboardType === 'decimal-pad' || keyboardType === 'numeric'
    ? 'number'
    : 'text';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) onSubmitEditing?.();
  };

  if (multiline) {
    return (
      <textarea
        style={{ ...inputStyle, resize: 'none' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChangeText?.(e.target.value)}
        autoFocus={autoFocus}
        onKeyDown={handleKeyDown}
        {...rest}
      />
    );
  }

  return (
    <input
      type={type}
      style={inputStyle}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      autoFocus={autoFocus}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
}

// ─── ScrollView ───────────────────────────────────────────────────────────────
export function ScrollView({
  style,
  contentContainerStyle,
  horizontal,
  showsHorizontalScrollIndicator = true,
  showsVerticalScrollIndicator = true,
  children,
  ...rest
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        overflow: horizontal ? 'auto hidden' : 'hidden auto',
        flex: 1,
        ...(!showsHorizontalScrollIndicator && { scrollbarWidth: 'none' }),
        ...(!showsVerticalScrollIndicator && { scrollbarWidth: 'none' }),
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', ...contentContainerStyle }}>
        {children}
      </div>
    </div>
  );
}

// ─── FlatList ─────────────────────────────────────────────────────────────────
export function FlatList({
  data,
  renderItem,
  keyExtractor,
  numColumns = 1,
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
  style,
  // key prop géré par React nativement — pas besoin de forward
  ...rest
}) {
  const items = data || [];

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {ListHeaderComponent}
      {items.length === 0 && ListEmptyComponent ? (
        ListEmptyComponent
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: numColumns > 1 ? 'row' : 'column',
            flexWrap: numColumns > 1 ? 'wrap' : 'nowrap',
            ...contentContainerStyle,
          }}
        >
          {items.map((item, index) => (
            <React.Fragment key={keyExtractor ? keyExtractor(item) : index}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SectionList ──────────────────────────────────────────────────────────────
export function SectionList({
  sections,
  keyExtractor,
  renderItem,
  renderSectionHeader,
  contentContainerStyle,
  style,
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto', ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', ...contentContainerStyle }}>
        {(sections || []).map((section, si) => (
          <div key={si}>
            {renderSectionHeader?.({ section })}
            {section.data.map((item, ii) => (
              <React.Fragment key={keyExtractor ? keyExtractor(item) : ii}>
                {renderItem({ item, section, index: ii })}
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ visible, children, onRequestClose, animationType }) {
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => { if (e.key === 'Escape') onRequestClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onRequestClose]);

  if (!visible) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        animation: animationType === 'fade' ? 'fadeIn 0.15s ease' : undefined,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── ActivityIndicator ────────────────────────────────────────────────────────
export function ActivityIndicator({ size = 'large', color = '#E63F00', style }) {
  const dim = size === 'large' ? 40 : 20;
  return (
    <div
      style={{
        width: dim, height: dim,
        border: `3px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        ...style,
      }}
    />
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export const Alert = {
  alert(title, message, buttons = []) {
    const msg = message ? `${title}\n\n${message}` : title;
    const destructive = buttons.find((b) => b.style === 'destructive');
    const cancel = buttons.find((b) => b.style === 'cancel');
    if (destructive) {
      if (window.confirm(msg)) destructive.onPress?.();
      else cancel?.onPress?.();
    } else {
      window.alert(msg);
      buttons.find((b) => b.style !== 'cancel')?.onPress?.();
    }
  },
};

// ─── Linking ─────────────────────────────────────────────────────────────────
export const Linking = {
  openURL: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
};

// ─── useWindowDimensions ─────────────────────────────────────────────────────
export function useWindowDimensions() {
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return dims;
}

// ─── KeyboardAvoidingView ─────────────────────────────────────────────────────
export function KeyboardAvoidingView({ style, children, ...rest }) {
  return <div style={viewBase(style)} {...rest}>{children}</div>;
}

// ─── Platform ─────────────────────────────────────────────────────────────────
export const Platform = { OS: 'web', select: (obj) => obj.web ?? obj.default };

// ─── useFocusEffect shim ──────────────────────────────────────────────────────
// En React Router chaque navigation remonte le composant → useEffect suffit.
export function useFocusEffect(callback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { callback(); }, []);
}
