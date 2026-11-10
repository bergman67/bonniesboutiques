import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bonnie's Boutique — B&T Trinkets",
    short_name: 'B&T Trinkets',
    description:
      'Handcrafted beaded pens, keychains, bag charms, bookmarks, framed diamond art, and boutique accessories made with love by Bonnie & Tammy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a0f24',
    theme_color: '#2d1b3d',
    icons: [
      {
        src: '/bt_logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
