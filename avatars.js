// Built-in hero avatars, drawn as small SVGs (100x100) so no image files are needed.

const SKIN = '#f1c27d';
const SHOULDERS = 'M12 100 Q14 74 50 72 Q86 74 88 100Z';

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
}

const PRESET_AVATARS = {
  super: {
    label: 'Superman',
    svg: svg(`
      <rect width="100" height="100" fill="#38bdf8"/>
      <path d="M6 100 Q10 70 50 68 Q90 70 94 100Z" fill="#dc2626"/>
      <path d="${SHOULDERS}" fill="#1d4ed8"/>
      <polygon points="38,80 62,80 68,87 50,100 32,87" fill="#facc15" stroke="#dc2626" stroke-width="2"/>
      <text x="50" y="93" font-family="Arial Black, Arial" font-weight="900" font-size="13" fill="#dc2626" text-anchor="middle">S</text>
      <ellipse cx="50" cy="46" rx="21" ry="25" fill="${SKIN}"/>
      <path d="M28 42 Q27 17 50 18 Q73 17 72 42 Q67 27 50 28 Q33 27 28 42Z" fill="#111"/>
      <path d="M50 28 q-7 5 -1 11" stroke="#111" stroke-width="3" fill="none"/>
      <circle cx="42" cy="47" r="2.5" fill="#1e293b"/><circle cx="58" cy="47" r="2.5" fill="#1e293b"/>
      <path d="M42 59 Q50 65 58 59" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  },
  spider: {
    label: 'Spider-Man',
    svg: svg(`
      <rect width="100" height="100" fill="#1e3a8a"/>
      <path d="${SHOULDERS}" fill="#dc2626"/>
      <path d="M50 78 l-6 6 l6 -2 l6 2z M50 82 v10" stroke="#111" stroke-width="2" fill="#111"/>
      <ellipse cx="50" cy="45" rx="23" ry="28" fill="#dc2626"/>
      <g stroke="#7f1d1d" stroke-width="1.2" fill="none">
        <path d="M50 17 V73 M27 45 H73 M34 25 L66 65 M66 25 L34 65"/>
        <path d="M40 30 Q50 34 60 30 M33 40 Q50 46 67 40 M31 52 Q50 58 69 52 M36 63 Q50 68 64 63"/>
      </g>
      <path d="M29 37 Q37 29 47 44 Q36 49 29 37Z" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M71 37 Q63 29 53 44 Q64 49 71 37Z" fill="#fff" stroke="#111" stroke-width="3"/>`),
  },
  bat: {
    label: 'Batman',
    svg: svg(`
      <rect width="100" height="100" fill="#fbbf24"/>
      <path d="M4 100 Q10 68 50 66 Q90 68 96 100Z" fill="#111827"/>
      <path d="${SHOULDERS}" fill="#4b5563"/>
      <path d="M36 88 Q42 84 44 88 L50 84 L56 88 Q58 84 64 88 Q56 92 50 96 Q44 92 36 88Z" fill="#111"/>
      <ellipse cx="50" cy="48" rx="22" ry="24" fill="${SKIN}"/>
      <path d="M27 52 L27 30 L30 10 L38 25 Q50 21 62 25 L70 10 L73 30 L73 52 Q66 50 63 54 Q50 50 37 54 Q34 50 27 52Z" fill="#1f2937"/>
      <path d="M35 40 L46 42 L45 45 L36 43Z" fill="#fff"/>
      <path d="M65 40 L54 42 L55 45 L64 43Z" fill="#fff"/>
      <path d="M43 63 L57 63" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>`),
  },
  hulk: {
    label: 'Hulk',
    svg: svg(`
      <rect width="100" height="100" fill="#7c3aed"/>
      <path d="M8 100 Q10 70 50 68 Q90 70 92 100Z" fill="#4d7c0f"/>
      <path d="M30 100 L36 86 L42 94 L50 84 L58 94 L64 86 L70 100Z" fill="#6d28d9"/>
      <ellipse cx="50" cy="47" rx="24" ry="25" fill="#65a30d"/>
      <path d="M26 42 L29 22 L36 28 L40 15 L46 25 L52 12 L56 24 L63 15 L65 27 L72 21 L74 42 Q50 28 26 42Z" fill="#111"/>
      <path d="M33 40 L46 45 M67 40 L54 45" stroke="#1a2e05" stroke-width="4" stroke-linecap="round"/>
      <circle cx="41" cy="49" r="2.5" fill="#1a2e05"/><circle cx="59" cy="49" r="2.5" fill="#1a2e05"/>
      <rect x="39" y="59" width="22" height="7" rx="2" fill="#fff" stroke="#1a2e05" stroke-width="2"/>
      <path d="M44.5 59 V66 M50 59 V66 M55.5 59 V66" stroke="#1a2e05" stroke-width="1"/>`),
  },
  iron: {
    label: 'Iron Man',
    svg: svg(`
      <rect width="100" height="100" fill="#111827"/>
      <path d="${SHOULDERS}" fill="#b91c1c"/>
      <circle cx="50" cy="89" r="6" fill="#e0f2fe" stroke="#38bdf8" stroke-width="2"/>
      <ellipse cx="50" cy="45" rx="23" ry="28" fill="#b91c1c"/>
      <path d="M33 33 Q50 28 67 33 L65 61 Q50 74 35 61Z" fill="#facc15"/>
      <path d="M37 44 L47 46 L46 49 L38 47Z M63 44 L53 46 L54 49 L62 47Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1"/>
      <path d="M43 63 L57 63" stroke="#a16207" stroke-width="2" stroke-linecap="round"/>`),
  },
  wonder: {
    label: 'Wonder Woman',
    svg: svg(`
      <rect width="100" height="100" fill="#be123c"/>
      <path d="M24 52 Q20 16 50 16 Q80 16 76 52 L80 84 L20 84Z" fill="#111"/>
      <path d="${SHOULDERS}" fill="#dc2626"/>
      <path d="M30 88 L40 82 L50 90 L60 82 L70 88" stroke="#facc15" stroke-width="3" fill="none"/>
      <ellipse cx="50" cy="48" rx="20" ry="24" fill="${SKIN}"/>
      <path d="M29 44 Q30 23 50 23 Q70 23 71 44 Q62 30 50 33 Q38 30 29 44Z" fill="#111"/>
      <path d="M31 36 Q50 27 69 36 L69 40 Q50 31 31 40Z" fill="#facc15"/>
      <polygon points="50,28 52,33 57,33 53,36 55,41 50,38 45,41 47,36 43,33 48,33" fill="#dc2626"/>
      <circle cx="42" cy="49" r="2.5" fill="#1e293b"/><circle cx="58" cy="49" r="2.5" fill="#1e293b"/>
      <path d="M44 61 Q50 65 56 61" stroke="#be123c" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  },
  cap: {
    label: 'Captain America',
    svg: svg(`
      <rect width="100" height="100" fill="#dc2626"/>
      <path d="${SHOULDERS}" fill="#1e40af"/>
      <polygon points="50,78 53,86 61,86 55,91 57,99 50,94 43,99 45,91 39,86 47,86" fill="#fff"/>
      <ellipse cx="50" cy="47" rx="22" ry="25" fill="${SKIN}"/>
      <path d="M27 54 Q25 18 50 18 Q75 18 73 54 L66 52 Q50 56 34 52Z" fill="#1e40af"/>
      <ellipse cx="41" cy="44" rx="6" ry="4.5" fill="${SKIN}"/><ellipse cx="59" cy="44" rx="6" ry="4.5" fill="${SKIN}"/>
      <circle cx="41" cy="44" r="2.3" fill="#1e293b"/><circle cx="59" cy="44" r="2.3" fill="#1e293b"/>
      <path d="M26 34 L18 28 L22 36 L16 36 L27 42Z M74 34 L82 28 L78 36 L84 36 L73 42Z" fill="#fff"/>
      <text x="50" y="35" font-family="Arial Black, Arial" font-weight="900" font-size="14" fill="#fff" text-anchor="middle">A</text>
      <path d="M43 62 Q50 67 57 62" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  },
  flash: {
    label: 'Flash',
    svg: svg(`
      <rect width="100" height="100" fill="#facc15"/>
      <path d="${SHOULDERS}" fill="#dc2626"/>
      <circle cx="50" cy="89" r="8" fill="#fff"/>
      <path d="M53 81 L46 89 L51 89 L47 97 L55 87 L50 87Z" fill="#eab308"/>
      <ellipse cx="50" cy="45" rx="23" ry="28" fill="#dc2626"/>
      <path d="M33 52 Q50 47 67 52 Q66 70 50 72 Q34 70 33 52Z" fill="${SKIN}"/>
      <path d="M36 40 L47 43 L46 46 L37 44Z M64 40 L53 43 L54 46 L63 44Z" fill="#fff"/>
      <path d="M27 38 L16 32 L23 42 L14 42 L28 50Z M73 38 L84 32 L77 42 L86 42 L72 50Z" fill="#facc15" stroke="#ca8a04" stroke-width="1"/>
      <path d="M43 62 Q50 66 57 62" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  },
};

function presetAvatarUrl(key) {
  const preset = PRESET_AVATARS[key];
  return preset ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(preset.svg) : '';
}

// Turns a friend's stored avatar ("preset:spider" or an uploaded data: URL) into an image URL.
function avatarUrl(avatar) {
  if (!avatar) return '';
  if (avatar.startsWith('preset:')) return presetAvatarUrl(avatar.slice(7));
  if (avatar.startsWith('data:image/')) return avatar;
  return '';
}

// Center-crops and shrinks an uploaded picture so it fits comfortably in localStorage.
function resizeImageFile(file, size = 160) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image the browser can open.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(
          img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
