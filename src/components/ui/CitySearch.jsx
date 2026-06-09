import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function CitySearch({ city, lat, lon, tzone, onChange }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(city || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  // Sync incoming city
  useEffect(() => {
    if (city !== query) setQuery(city || '');
  }, [city]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchCity = (q) => {
    setQuery(q);
    onChange({ city: q });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setSuggestions([]); setShowDrop(false); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowDrop(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const pickCity = async (place) => {
    const latNum = parseFloat(place.lat).toFixed(6);
    const lonNum = parseFloat(place.lon).toFixed(6);
    const parts = place.display_name.split(',').slice(0, 3);
    let label = parts.join(', ');
    
    // Add pincode if available
    const postcode = place.address?.postcode;
    if (postcode) {
      label += ` - ${postcode}`;
    }

    // Attempt to get accurate timezone from TimeAPI (free, no key)
    let tz = -(new Date().getTimezoneOffset() / 60); // Default fallback
    try {
      const tzRes = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${latNum}&longitude=${lonNum}`);
      if (tzRes.ok) {
        const tzData = await tzRes.json();
        // TimeAPI returns currentUtcOffset.seconds (e.g. 19800 for IST = 5.5 hours)
        if (tzData?.currentUtcOffset?.seconds) {
          tz = tzData.currentUtcOffset.seconds / 3600;
        }
      }
    } catch {
      console.warn("Timezone API failed, using browser offset.");
    }

    setQuery(label);
    setShowDrop(false);
    setSuggestions([]);
    onChange({ city: label, lat: latNum, lon: lonNum, tzone: tz });
    toast.success(`📍 ${label} → ${latNum}, ${lonNum}`);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const latNum = latitude.toFixed(6);
        const lonNum = longitude.toFixed(6);
        let tzOffset = -(new Date().getTimezoneOffset() / 60);
        
        try {
          const tzRes = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${latNum}&longitude=${lonNum}`);
          if (tzRes.ok) {
            const tzData = await tzRes.json();
            if (tzData?.currentUtcOffset?.seconds) tzOffset = tzData.currentUtcOffset.seconds / 3600;
          }
        } catch {}

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const cityName = data.address?.city || data.address?.town || data.address?.village || 'Current Location';
          const countryName = data.address?.country || '';
          const postcode = data.address?.postcode || '';
          
          let label = `${cityName}, ${countryName}`;
          if (postcode) label += ` - ${postcode}`;

          setQuery(label);
          onChange({ city: label, lat: latNum, lon: lonNum, tzone: tzOffset });
          toast.success(`📍 ${label}`);
        } catch {
          onChange({ lat: latNum, lon: lonNum, tzone: tzOffset });
          toast.success(`📍 Location set`);
        }
        setLocating(false);
      },
      () => { toast.error('Location denied'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const inputStyle = { padding: '0.6rem 0.8rem', fontSize: '0.85rem' };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          className="input-gold"
          value={query}
          onChange={(e) => searchCity(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder="Type city of birth…"
          style={{ ...inputStyle, width: '100%', paddingLeft: '2.2rem', paddingRight: '2rem', boxSizing: 'border-box' }}
        />
        <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', lineHeight: 1 }}>
          {searching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
        </span>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleGPS}
          disabled={locating}
          title="Use my current location"
          type="button"
          style={{
            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: locating ? 'var(--text-muted)' : 'var(--primary)',
            padding: 0, lineHeight: 1,
          }}
        >
          <MapPin size={15} />
        </motion.button>
      </div>

      <AnimatePresence>
        {showDrop && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0, right: 0,
              zIndex: 500,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              maxHeight: '220px',
              overflowY: 'auto'
            }}
          >
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => pickCity(s)}
                style={{
                  padding: '0.65rem 0.9rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text)',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,215,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: 'var(--primary)', fontWeight: 600, marginRight: '0.4rem' }}>📍</span>
                {s.display_name.split(',').slice(0, 4).join(', ')}
                {s.address?.postcode && <span style={{color: 'var(--text-muted)', marginLeft: '6px'}}>- {s.address.postcode}</span>}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extracted coords preview */}
      {lat && lon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: '0.4rem',
            fontSize: '0.72rem',
            color: '#4ade80',
            display: 'flex',
            gap: '1rem',
            paddingLeft: '0.2rem',
          }}
        >
          <span>🌐 Lat: {lat}</span>
          <span>Lon: {lon}</span>
          <span>TZ: UTC{parseFloat(tzone) >= 0 ? '+' : ''}{tzone}</span>
        </motion.div>
      )}
    </div>
  );
}
