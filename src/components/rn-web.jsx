/**
 * Shims React Native → DOM.
 * Les screens importent depuis ici au lieu de 'react-native'.
 * API volontairement limitée aux composants utilisés dans l'appli.
 */
import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// ─── StyleSheet ──────────────────────────────────────────────────────────────
export const StyleSheet = { create: (s) => s };

// ─── Expo font name → CSS mapping ────────────────────────────────────────────
const EXPO_FONT_MAP = {
  Poppins_400Regular:    { fontFamily: "'Poppins', sans-serif", fontWeight: '400' },
  Poppins_500Medium:     { fontFamily: "'Poppins', sans-serif", fontWeight: '500' },
  Poppins_600SemiBold:   { fontFamily: "'Poppins', sans-serif", fontWeight: '600' },
  Poppins_700Bold:       { fontFamily: "'Poppins', sans-serif", fontWeight: '700' },
  Poppins_800ExtraBold:  { fontFamily: "'Poppins', sans-serif", fontWeight: '800' },
};

// ─── Merge styles (supporte les tableaux comme React Native) ─────────────────
// Transforme style={[a, b && c, { d: 1 }]} en objet plat pour le DOM.
export function flatStyle(style) {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    return flatStyle(Object.assign({}, ...style.filter(Boolean).map(flatStyle)));
  }
  // Map Expo font names → proper CSS fontFamily + fontWeight
  if (style.fontFamily && EXPO_FONT_MAP[style.fontFamily]) {
    return { ...style, ...EXPO_FONT_MAP[style.fontFamily] };
  }
  return style;
}

// ─── Helpers style ───────────────────────────────────────────────────────────
// React Native: View est flex column par défaut.
// minHeight: 0 est CRUCIAL : sans ça, les flex items ont min-height: auto
// et ne peuvent pas se contraindre en-dessous de leur contenu → overflow/scroll cassé.
function viewBase(style) {
  return {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    minHeight: 0,
    ...flatStyle(style),
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
    <span style={{ fontFamily: 'Poppins, sans-serif', ...clamp, ...flatStyle(style) }} {...rest}>
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
        // manipulation = taps instantanés sur mobile, sans bloquer le scroll parent
        touchAction: 'manipulation',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        minHeight: 0,
        ...flatStyle(style),
        opacity: disabled ? 0.5 : 1,
      }}
      onClick={disabled ? undefined : (e) => onPress?.(e)}
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
      style={{ objectFit: RESIZE_MAP[resizeMode] ?? 'cover', display: 'block', ...flatStyle(style) }}
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
    ...flatStyle(style),
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
        // Pas de flex: 1 par défaut — les ScrollView verticaux qui doivent grandir
        // doivent passer style={{ flex: 1 }} explicitement.
        // Les ScrollView horizontaux (filtres) doivent rester à leur hauteur naturelle.
        ...(horizontal
          ? {}
          : { flex: 1, minHeight: 0, touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }),
        ...(!showsHorizontalScrollIndicator && { scrollbarWidth: 'none' }),
        ...(!showsVerticalScrollIndicator && { scrollbarWidth: 'none' }),
        ...flatStyle(style),
      }}
      {...rest}
    >
      <div style={{ display: 'flex', flexDirection: horizontal ? 'row' : 'column', ...flatStyle(contentContainerStyle) }}>
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
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        // Mobile : touch-action autorise le scroll vertical même si un enfant a des handlers touch
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        ...flatStyle(style),
      }}
    >
      {ListHeaderComponent}
      {items.length === 0 && ListEmptyComponent ? (
        ListEmptyComponent
      ) : (
        <div
          style={
            numColumns > 1
              ? {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
                  ...flatStyle(contentContainerStyle),
                }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  ...flatStyle(contentContainerStyle),
                }
          }
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
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', ...flatStyle(style) }}>
      <div style={{ display: 'flex', flexDirection: 'column', ...flatStyle(contentContainerStyle) }}>
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
