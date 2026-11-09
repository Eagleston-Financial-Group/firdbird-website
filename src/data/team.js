// Firebird team shown on the About page (and the first four on the home page).
// Photos are 480px square WebP crops generated from the originals in public/images/team/.
export const team = [
  { name: 'Van Goodman', photo: '/images/team/van-480.webp', size: 480, bio: 'Commercial insurance with a focus on construction and trade contractors.', featured: true },
  { name: 'Collin Short', photo: '/images/team/collin-480.webp', size: 480, featured: true },
  { name: 'Travis Sibley', photo: '/images/team/travis-480.webp', size: 480, featured: true },
  { name: 'John Eagleston', photo: '/images/team/john-480.webp', size: 480, featured: true },
  { name: 'Christine Cook', photo: '/images/team/christine-cook-480.webp', size: 480 },
  { name: 'Srinath Pulagalla', photo: '/images/team/srinath-pulagalla-480.webp', size: 480 },
  { name: 'Valerie Blake', photo: '/images/team/valerie-blake-480.webp', size: 200 },
  { name: 'Sarah Bingham', photo: '/images/team/sarah-bingham-480.webp', size: 200 },
  { name: 'Rob Eagleston', photo: '/images/team/rob-eagleston-480.webp', size: 480 },
  { name: 'Vince Manuele', photo: '/images/team/vince-manuele-480.webp', size: 200 },
];

export const featuredTeam = team.filter(member => member.featured);
