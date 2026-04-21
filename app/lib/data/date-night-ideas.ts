export type DateVibe = 'cozy' | 'adventurous' | 'romantic' | 'silly'
export type DateSetting = 'in' | 'out'
export type DateBudget = 'free' | 'low' | 'mid' | 'high'

export interface DateIdea {
  id: string
  title: string
  vibe: DateVibe
  setting: DateSetting
  budget: DateBudget
  est_minutes: number
}

export const dateIdeas: DateIdea[] = [
  { id: 'cook-new-cuisine', title: 'Cook a cuisine neither of you has tried', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 120 },
  { id: 'sunrise-walk', title: 'Watch the sunrise together with coffee', vibe: 'romantic', setting: 'out', budget: 'free', est_minutes: 60 },
  { id: 'puzzle-night', title: '1000-piece puzzle + favorite playlist', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'museum-day', title: 'Spend the afternoon at a local museum', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'silent-disco', title: 'Silent disco in the living room', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'stargazing', title: 'Drive somewhere dark and watch stars', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'farmers-market', title: 'Farmers market then cook the haul', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'home-spa', title: 'Build an at-home spa night', vibe: 'romantic', setting: 'in', budget: 'low', est_minutes: 120 },
  { id: 'thrift-challenge', title: '$20 thrift store outfit challenge', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'hike-new-trail', title: 'Hike a trail neither has done', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 240 },
  { id: 'movie-marathon', title: "Marathon a director's filmography", vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 360 },
  { id: 'pottery-class', title: 'Take a pottery / paint class', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'recreate-first-date', title: 'Recreate your first date', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'board-game-bracket', title: 'Run a 4-game board game bracket', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 180 },
  { id: 'picnic-park', title: 'Pack a picnic for the nearest park', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'cocktail-experiment', title: 'Invent two new cocktails together', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'photo-walk', title: 'Photo walk — only black & white shots', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 90 },
  { id: 'love-letters', title: 'Write each other a love letter, exchange', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'concert', title: 'Catch a small local concert', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'breakfast-for-dinner', title: 'Breakfast for dinner in pajamas', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'kayak', title: 'Rent kayaks for a couple hours', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'open-mic', title: 'Open mic night — comedy or music', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'fireplace-reading', title: 'Take turns reading a book aloud', vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 90 },
  { id: 'mini-golf', title: 'Mini golf with loser-pays-dessert wager', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'rooftop-dinner', title: 'Cook fancy + eat on the rooftop/balcony', vibe: 'romantic', setting: 'in', budget: 'mid', est_minutes: 180 },
  { id: 'gallery-hop', title: 'Gallery hop in the arts district', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 180 },
  { id: 'horror-night', title: 'Horror movie night with a blanket fort', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 150 },
  { id: 'bike-ride', title: 'Bike ride to a coffee shop you have not tried', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'karaoke', title: 'Karaoke duets — must sing one each', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'memory-replay', title: 'Pick a year from your timeline, scroll together', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'tasting-flight', title: 'Wine / coffee / tea tasting flight', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'plan-fantasy-trip', title: 'Plan a fantasy trip you would never take', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'volunteer', title: 'Volunteer somewhere together for a morning', vibe: 'adventurous', setting: 'out', budget: 'free', est_minutes: 180 },
  { id: 'craft-night', title: 'Pick one craft — try to finish it tonight', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'food-truck', title: 'Hit three food trucks, share everything', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'dancing-lesson', title: 'YouTube dance lesson in the kitchen', vibe: 'silly', setting: 'in', budget: 'free', est_minutes: 60 },
  { id: 'beach-bonfire', title: 'Beach bonfire with snacks', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 240 },
  { id: 'garden-project', title: 'Plant something together — herb or flower', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'language-class', title: 'Try one Duolingo language together', vibe: 'cozy', setting: 'in', budget: 'free', est_minutes: 45 },
  { id: 'antique-store', title: 'Browse an antique store, pick gifts for each other', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'fancy-dinner', title: 'Splurge on a tasting menu somewhere new', vibe: 'romantic', setting: 'out', budget: 'high', est_minutes: 180 },
  { id: 'escape-room', title: 'Book an escape room', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'long-walk-no-phone', title: 'Two-hour walk, no phones', vibe: 'romantic', setting: 'out', budget: 'free', est_minutes: 120 },
  { id: 'nostalgic-snacks', title: "Buy each other's childhood snacks, taste-test", vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 60 },
  { id: 'farm-day', title: 'U-pick farm — berries / pumpkins / flowers', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'home-improvement', title: 'Tackle one home project together', vibe: 'cozy', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'sunset-drive', title: 'Drive somewhere just for the sunset', vibe: 'romantic', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'recipe-swap', title: 'Each cook one course, no peeking', vibe: 'silly', setting: 'in', budget: 'mid', est_minutes: 180 },
  { id: 'thrift-then-makeover', title: 'Thrift outfits then dress each other', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'rock-climbing', title: 'Indoor rock climbing or bouldering', vibe: 'adventurous', setting: 'out', budget: 'mid', est_minutes: 120 },
  { id: 'bookshop-pick', title: 'Pick a book for each other at a bookstore', vibe: 'cozy', setting: 'out', budget: 'low', est_minutes: 60 },
  { id: 'plan-bucket-list', title: 'Add 10 things to your shared bucket list', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 45 },
  { id: 'coffee-crawl', title: 'Coffee crawl — three shops, half a drink each', vibe: 'adventurous', setting: 'out', budget: 'low', est_minutes: 120 },
  { id: 'pie-bake-off', title: 'Pie bake-off using the same crust recipe', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 180 },
  { id: 'sound-bath', title: 'Sound bath or yoga class together', vibe: 'cozy', setting: 'out', budget: 'mid', est_minutes: 90 },
  { id: 'old-photos', title: 'Pull out old photo albums and reminisce', vibe: 'romantic', setting: 'in', budget: 'free', est_minutes: 90 },
  { id: 'museum-after-hours', title: 'After-hours museum or gallery event', vibe: 'romantic', setting: 'out', budget: 'mid', est_minutes: 180 },
  { id: 'farm-to-table-class', title: 'Cooking class at a local market', vibe: 'adventurous', setting: 'out', budget: 'high', est_minutes: 180 },
  { id: 'paint-each-other', title: 'Paint each other — keep the worst one', vibe: 'silly', setting: 'in', budget: 'low', est_minutes: 90 },
  { id: 'ice-cream-tour', title: 'Ice cream from three places, rank them', vibe: 'silly', setting: 'out', budget: 'low', est_minutes: 90 },
  { id: 'plan-next-trip', title: 'Plan your next trip — book one thing tonight', vibe: 'adventurous', setting: 'in', budget: 'free', est_minutes: 90 },
]
