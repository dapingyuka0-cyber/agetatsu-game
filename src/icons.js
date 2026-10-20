const paths={
 sound:'<path d="M5 10h5l7-6v24l-7-6H5z" fill="currentColor" stroke="none"/><path d="M22 10q7 6 0 12m4-17q13 11 0 22"/>',
 mute:'<path d="M5 10h5l7-6v24l-7-6H5z" fill="currentColor" stroke="none"/><path d="m23 11 9 11m0-11-9 11"/>',
 gear:'<path d="m14 3 5 0 1 4 4 2 4-1 3 5-3 3v4l3 3-3 5-4-1-4 2-1 4h-5l-1-4-4-2-4 1-3-5 3-3v-4l-3-3 3-5 4 1 4-2z" fill="currentColor" stroke="none"/><circle cx="16.5" cy="18" r="6" fill="#fff0d6" stroke="none"/>',
 timer:'<circle cx="18" cy="20" r="13"/><path d="M18 12v9l7 4M14 2h8m-4 0v5m11 1 3 3"/>',
 thermometer:'<path d="M14 20V7a4 4 0 0 1 8 0v13a8 8 0 1 1-8 0z"/><path d="M18 10v17" stroke="#ff9e28" stroke-width="5"/><circle cx="18" cy="27" r="4" fill="#ff9e28" stroke="none"/>',
 drop:'<path d="M18 3v19m-8-8 8 9 8-9"/><path d="M5 26q13 9 26 0"/>',
 flip:'<path d="M5 15A13 13 0 0 1 28 8l3 5M31 21A13 13 0 0 1 8 28l-3-5"/><path d="m23 12 8 1 1-8M13 24l-8-1-1 8"/>',
 lift:'<path d="M2 3 15 21m-3 4 18-10M13 23q8 13 17 3q7-9-3-12"/><path d="m16 21 12 5m-9-8 8 11m-4-13 1 14" stroke-width="1.4"/>',
 reset:'<path d="M7 13a12 12 0 1 1 0 13M7 13V4m0 9h9"/>',
 crown:'<path d="m4 9 7 8 7-13 7 13 7-8-3 21H7z"/><circle cx="4" cy="7" r="2" fill="currentColor"/><circle cx="18" cy="3" r="2" fill="currentColor"/><circle cx="32" cy="7" r="2" fill="currentColor"/>',
 pause:'<path d="M13 7v23m11-23v23" stroke-width="6"/>',
 play:'<path d="m10 5 21 13-21 13z" fill="currentColor" stroke="none"/>'
};
export const icon=(name,cls='')=>`<svg class="glyph ${cls}" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.gear}</svg>`;
