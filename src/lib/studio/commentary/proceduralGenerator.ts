/**
 * src/lib/studio/commentary/proceduralGenerator.ts
 *
 * $0/Month Deep Procedural Commentary Generator across 6 Distinct Show Formats.
 * Provides over 36 distinct scenarios (6 per show format), 8 dynamic title formulas
 * per format (48 total) with catalog product parameterization, tight reaction clip
 * synchronization for wild nature commentary, and conversational banter.
 */

import type { SkitTemplate, SkitBeat, NatGeoScene } from '../skitTemplates';
import type { ShowFormatId, ProceduralSlotContext } from './types';
import type { BackdropId } from '../backdrops';

// Pseudorandom helper with seed support
function pickRandom<T>(items: readonly T[], seed?: number): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  const factor = typeof seed === 'number' ? Math.abs(Math.sin(seed * 9301 + 49297)) % 1 : Math.random();
  const idx = Math.floor(factor * items.length);
  return items[idx];
}

function cleanTitle(title: string): string {
  return title.replace(/['"]/g, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 1: WILD NATURE COMMENTARY (Channel 42 Wildlife Watch)
// ─────────────────────────────────────────────────────────────────────────────
export interface WildlifeScenario {
  scene: NatGeoScene;
  clipFile: string;
  animal: string;
  hooks: string[];
  grandmaTwists: string[];
  tammyRebuttals: string[];
  interruptions: string[];
  punchlines: string[];
}

export const WILDLIFE_SCENARIOS: WildlifeScenario[] = [
  {
    scene: 'octopus_architect',
    clipFile: 'octopus_observatory.mp4',
    animal: 'Deep-Sea Octopus',
    hooks: [
      'Mom, look at the shop monitor! That deep-sea octopus is inspecting an underwater camera like a strict landlord.',
      'Check Channel 42, Mom! An eight-legged tenant is tapping on the glass demanding rent reductions.',
      'Mom, hurry over! This deep-sea octopus at 2,000 meters looks like he is measuring the reef for curtains.',
      'Look at the shop screen, Mom! That octopus is giving the research submarine absolute side-eye.',
      'Mom, wake up! This octopus is arranging seashells outside his den like he runs a rival boutique.',
    ],
    grandmaTwists: [
      'Oh bless his suction cups, Tammy! The ocean is drafty—I should knit him eight tiny lavender wool sleeves!',
      'He is looking for a snug place to nap! If he came into the boutique, he could hold eight pens at the same time.',
      'That poor darling looks hungry. I bet nobody down in the midnight zone ever made him warm chicken soup.',
      'He is not inspecting anything, honey! He is just admiring his reflection! He has got wonderful posture.',
      'Look at how gently he taps the glass! He is polite! More polite than the mailman when the porch is icy.',
    ],
    tammyRebuttals: [
      'Mom, you cannot knit eight sleeves for a cephalopod living under 300 atmospheres of hydrostatic pressure!',
      'Mom, please do not invite deep-sea predators to staff the counter, he has +9,000 eldritch aura!',
      'Mom, he does not want chicken soup, he wants crabs and crustacean souls! Look at his tentacles!',
      'He is not being polite, Mom, he is testing the structural integrity of the titanium dome!',
      'Mom, if an octopus worked our register, the till would be covered in seawater and ink cartridges!',
    ],
    interruptions: [
      '—Wait, hold on, did you just say eight wool sleeves?!—',
      '—Mom, pause right there, you are not FedEx-ing knitwear to the Mariana Trench!—',
      '—Excuse me, did you see him camouflage into coral just now?!—',
      '—Hold up, he literally just stole a researcher’s wrench on live TV!—',
    ],
    punchlines: [
      'Well, until he learns to hold a pen, you folks tap the link for our handmade "{TITLE}"!',
      'Fine! But he would look positively dashing wearing our handmade "{TITLE}" around one wrist!',
      'No knitwear, fine! But every ocean explorer needs our handmade "{TITLE}" to keep their sanity intact!',
      'Tell him to visit btboutiqe.com! We have got our sparkling "{TITLE}" ready to ship!',
    ],
  },
  {
    scene: 'capybara_spa',
    clipFile: 'baby_capybaras.mp4',
    animal: 'Baby Capybaras',
    hooks: [
      'Mom, look at the top screen! Baby capybaras soaking in a hot spring with +100,000 unbothered aura.',
      'Channel 42 update: A flock of baby capybaras are having a thermal spa day and ignoring all their problems.',
      'Mom, behold peak serenity! These baby capybaras are letting little ducks sit directly on their heads.',
      'Look at the TV, Mom! Those little capybaras are living life at 0.5x speed with zero stress detected.',
      'Mom, look! Baby capybaras taking warm citrus baths like miniature zen masters.',
    ],
    grandmaTwists: [
      'Oh, sweet peas! They look just like your cousins at the community pool, minus the water wings!',
      'Look at those sweet chunky cheeks! I could wrap them in fluffy fleece towels and serve them tea biscuits.',
      'Bless their little ears! That is the kind of peace and quiet I pray for during Saturday morning craft fairs.',
      'They have such good manners! Look how still they sit while the duck rearranges their forehead fur.',
      'Tammy, they look so cozy. I wonder if capybaras like honey chamomile tea or warm oat milk.',
    ],
    tammyRebuttals: [
      'Mom, cousin Kevin never had that much tranquility in his entire mortal existence.',
      'Mom, capybaras weigh 140 pounds fully grown, you cannot wrap them in a tea towel like kittens!',
      'Their aura is completely unmatched! I have been watching them for ten minutes and my blood pressure dropped 20 points.',
      'Mom, if I had ducks nesting on my head at work, you would tell me to wash my hair immediately!',
      'Mom, they do not drink chamomile tea, they eat river grasses and soak in geothermal mineral water!',
    ],
    interruptions: [
      '—Wait, is that a turtle sitting on the second capybara’s back?!—',
      '—Mom, look! Another baby just slid into the water like a pat of warm butter!—',
      '—Hold on, they have literally not blinked in two full minutes!—',
      '—Stop, the duck is actually preening his whiskers right now!—',
    ],
    punchlines: [
      'If you need that capybara serenity today, our handmade "{TITLE}" radiates maximum cozy vibes!',
      'Channel that unbothered aura! Grab Bonnie’s handmade "{TITLE}" over at btboutiqe.com!',
      'Sweet peace and quiet in your pocket! Tap below for our handcrafted "{TITLE}" before it sells out!',
      'May your day be as peaceful as a baby capybara with our handmade "{TITLE}" on your desk!',
    ],
  },
  {
    scene: 'penguin_heist',
    clipFile: 'penguins_slowmo.mp4',
    animal: 'Antarctic Penguins',
    hooks: [
      'Mom, look at the TV! Antarctic penguins waddling in slow motion like they are planning a jewelry heist.',
      'Channel 42 breaking news: A crew of tuxedo birds is sliding down an ice ramp with chaotic momentum.',
      'Mom, look at these penguins! They walk with the exact swagger of teenagers arriving late to homeroom.',
      'Watch the screen, Mom! That penguin just shoved his buddy off the ice shelf to test the water!',
      'Mom! The penguins are mobilizing in formation across the ice sheet like little feathered secret agents.',
    ],
    grandmaTwists: [
      'Look at those lovely tuxedo suits! They look so dressed up for 10 degrees below zero.',
      'That little one tripped on his tummy and popped right back up! Just like your father on the roller rink!',
      'Oh, they are shivering! I should mail them double-lined flannel booties with rubber traction grips.',
      'They are waddling in a straight line! That is better discipline than the church choir during rehearsal.',
      'Look at that belly slide! If I tried that on our front porch, the paramedics would be having lunch here.',
    ],
    tammyRebuttals: [
      'Mom, they do not need flannel booties, their feet have counter-current heat exchange blood vessels!',
      'He did not trip, Mom, sliding on ice is aerodynamic velocity! He is drifting across Antarctica!',
      'Mom, the one in front is not dressed up, that is counter-shading camouflage so leopard seals do not eat him!',
      'Dad on roller skates never looked that coordinated, and you know it!',
      'Mom, please do not try sliding across the porch on your stomach, our insurance deductible is $500!',
    ],
    interruptions: [
      '—Wait, did he just slap his friend with his flipper?!—',
      '—Mom, look at that air time! He just leaped five feet onto an iceberg!—',
      '—Hold on, the entire flock is waddling backward now!—',
      '—Stop, look at the little baby penguin peeking out from under the feathers!—',
    ],
    punchlines: [
      'Dress up your day like a penguin in a tuxedo! Tap below for our sparkling "{TITLE}"!',
      'Slide into maximum style! Snag our handcrafted "{TITLE}" at btboutiqe.com!',
      'No Antarctic frostbite required! Our handmade "{TITLE}" brings 100% warmth to your desk!',
      'Waddle with confidence! Grab your very own handmade "{TITLE}" before the flock takes off!',
    ],
  },
  {
    scene: 'anglerfish',
    clipFile: 'phantom_jellyfish.mp4',
    animal: 'Giant Phantom Jellyfish',
    hooks: [
      'Mom, look at Channel 42! A giant phantom jellyfish floating through the midnight zone like silk fabric.',
      'Check the monitor, Mom! That jellyfish has 30-foot ribbon arms undulating in total pitch black darkness.',
      'Mom, look at this deep-sea jellyfish! It looks like an enchanted Victorian evening gown with a pulse.',
      'Look at the shop TV! A phantom jellyfish drifting at 3,000 feet looking majestically terrifying.',
      'Mom, hurry! This deep ocean creature looks like someone threw a roll of dark silk velvet into the abyss.',
    ],
    grandmaTwists: [
      'Oh my stars! Tammy, that looks like my mother’s Sunday church bonnet if it fell into an aquarium!',
      'Look at those lovely draping ribbons! That creature has better fabric drape than the boutique curtains.',
      'Bless its heart, it has got no skeleton at all! Just pure graceful jelly and good posture.',
      'It moves so gently! I bet it would be wonderful at helping me hold skeins of embroidery floss.',
      'Look how quiet it is down there. No telemarketers, no leaf blowers, just peaceful swimming ribbons.',
    ],
    tammyRebuttals: [
      'Mom, Grandma never wore a 30-foot bioluminescent bonnet that swallows plankton in the dark!',
      'Mom, those are not ribbons, those are oral arms designed to ensnare and consume prey in the abyss!',
      'Do not bring giant jellyfish near your embroidery thread, it will dissolve into organic slime!',
      'Mom, if you floated through the abyss without a skeleton, who is going to bake the pumpkin bread?!',
      'It does not have telemarketers because radio signals attenuate after 200 meters of saltwater, Mom!',
    ],
    interruptions: [
      '—Wait, did the water just light up neon blue behind its bell?!—',
      '—Mom, look at the scale bar, that thing is ten meters wide!—',
      '—Hold on, it just folded its arms like an accordion!—',
      '—Stop right there, it is literally drifting toward the camera lens!—',
    ],
    punchlines: [
      'Bring that hypnotic deep-sea elegance to your counter with our handmade "{TITLE}"!',
      'Drape yourself in beauty without deep-sea tentacles! Grab our "{TITLE}" at btboutiqe.com!',
      'Handcrafted sparkle that glows in any room! Tap the link for your "{TITLE}"!',
      'Floating gracefully through life! Check out Bonnie’s handmade "{TITLE}" in the shop today!',
    ],
  },
  {
    scene: 'mantis_shrimp',
    clipFile: 'hermit_crab.mp4',
    animal: 'Pacific Hermit Crab',
    hooks: [
      'Mom, look at Channel 42! This little hermit crab is trying on new seashell houses like a beachside fashion runway.',
      'Check the TV, Mom! A hermit crab just evicted himself from a broken conch shell and is inspecting an upgrade.',
      'Mom, look at this! This little crustacean is measuring an abandoned snail shell with his antennae like a picky homeowner.',
      'Channel 42 update: A hermit crab is scuttling sideways across the tidepool carrying his entire mortgage on his back.',
      'Mom, hurry over! This hermit crab just did a complete 360 spin to check the curb appeal of a new seashell.',
    ],
    grandmaTwists: [
      'Oh bless his tiny pinchers! Moving is so stressful—I should send him bubble wrap and a warm plate of sugar cookies!',
      'Tammy, look how tidy he is! He keeps his whole house spotless because he cannot leave any clutter behind!',
      'If he came to the boutique, I could bedazzle his shell with pink rhinestones and lavender pearlescent resin!',
      'Bless his heart, he has got no moving van at all! Just two strong legs and a dream of oceanfront living.',
      'Look at him back into that shell! That is how your father backs the station wagon into the garage during a snowstorm.',
    ],
    tammyRebuttals: [
      'Mom, you cannot FedEx bubble wrap to an intertidal zone, sea turtles will try to eat it!',
      'Mom, he does not have clutter because his entire living room is 2 cubic centimeters inside a gastropod mollusk!',
      'Do not bedazzle a wild crustacean, Mom! Rhinestones will make him a neon beacon for hungry seagulls!',
      'Dad never backed the station wagon that smoothly, Mom, he took out the trash cans three Christmases in a row!',
      'Mom, he is not packing up a home, he is undergoing biological shell exchange under fierce predator pressure!',
    ],
    interruptions: [
      '—Wait, did another crab just try to steal his old shell?!—',
      '—Mom, look! He literally did a parallel park into the conch!—',
      '—Hold on, did he just test the shell depth with his claw?!—',
      '—Stop, he is waving his antennae like tiny windshield wipers!—',
    ],
    punchlines: [
      'Upgrade your shell like a stylish crab! Tap the link for our handcrafted "{TITLE}"!',
      'Carry your sparkle everywhere you go! Grab Bonnie’s handmade "{TITLE}" at btboutiqe.com!',
      'No high rent on this beach! Check out our dazzling handmade "{TITLE}" ready to ship!',
      'House-hunting made fabulous! Treat yourself to our one-of-a-kind "{TITLE}" today!',
    ],
  },
  {
    scene: 'honey_badger',
    clipFile: 'savanna_meerkat.mp4',
    animal: 'Savanna Meerkats',
    hooks: [
      'Mom, look at the shop screen! A savanna meerkat is standing at attention like the captain of the neighborhood watch.',
      'Channel 42 alert: Three meerkats on their tiptoes are aggressively scanning the horizon for gossiping buzzards.',
      'Mom, look at this sentry meerkat! He has got better spine posture than anyone in our entire family tree.',
      'Watch the monitor, Mom! That meerkat heard a twig snap and whipped his head around like he caught someone trespassing.',
      'Mom, hurry! These little savanna sentries are running reconnaissance like little furry security guards in the Kalahari.',
    ],
    grandmaTwists: [
      'Oh, look at that alert posture! He reminds me of Mrs. Gable peeking through her window blinds when the mail arrives!',
      'Bless their little bellies! Standing out in the desert sun all day—I want to bring them iced lemonade and sun visors.',
      'Tammy, they look so diligent! If they worked front-desk security at the boutique, shoplifters wouldn’t stand a chance.',
      'Look how they take turns on duty! That is wonderful teamwork. Just like our Sunday bake sale crew.',
      'Bless his heart, his little paws are folded so politely across his tummy! He is a perfect gentleman.',
    ],
    tammyRebuttals: [
      'Mom, Mrs. Gable does not have 360-degree raptor detection vision, she just wants to know who ordered Amazon packages!',
      'Mom, meerkats get all their hydration from roots and scorpions, they do not drink country-time lemonade!',
      'Mom, meerkats weigh two pounds, a shoplifter would think he is a fuzzy plushie and take him home!',
      'The bake sale crew never looked that unified, Aunt Brenda argued about snickerdoodles for two straight hours!',
      'He is not being a gentleman, Mom, he is whistling an alarm call so twenty relatives can dive into the nearest bunker!',
    ],
    interruptions: [
      '—Wait, did all three of them just synchronize their head turns?!—',
      '—Mom, look! One of them just stood on a termite mound for extra elevation!—',
      '—Hold on, did he just dig a three-foot hole in four seconds?!—',
      '—Stop right there, he literally just barked like a miniature Chihuahua!—',
    ],
    punchlines: [
      'Keep watch over your style with Bonnie’s handcrafted "{TITLE}"!',
      'Stay alert and sparkling! Tap below for our handmade "{TITLE}" at btboutiqe.com!',
      'No desert sandstorms required! Snag your very own "{TITLE}" before the sentry sounds the alarm!',
      'Top-tier vigilance meets boutique glamour! Grab our dazzling "{TITLE}" today!',
    ],
  },
  {
    scene: 'pottery_wheel_spin',
    clipFile: 'pottery_wheel_spin.mp4',
    animal: 'Spinning Pottery Wheel',
    hooks: [
      'Mom, look at the shop TV! This ceramic artist is centering wet clay on a high-speed pottery wheel with surgical precision.',
      'Check out Channel 42’s craft hour, Mom! That potter is shaping a stoneware vase at 200 RPM without spilling a single drop of slip.',
      'Mom, look at the monitor! That lump of clay just transformed into a symmetrical porcelain bowl in four seconds flat.',
      'Watch the shop screen, Mom! The pottery wheel is spinning so fast it looks like hypnosis for art teachers.',
      'Mom, hurry over! They are throwing pottery on the TV and my brain just entered total zen mode.',
    ],
    grandmaTwists: [
      'Oh my word, Tammy! Last time I tried a pottery wheel in 1979, my clay flew across the room and landed in the instructor’s coffee mug!',
      'Look at those muddy hands! If I got that much wet clay on my lace apron, I’d have to soak it in baking soda until Tuesday.',
      'Bless their thumbs! That looks just like me frosting a three-tier lemon meringue cake on a lazy Susan!',
      'Tammy, don’t let your father watch this—he’ll try hooking the potter’s wheel up to the lawnmower engine for extra torque!',
      'It is so soothing! Until someone sneezes and that lovely vase turns into a lopsided gravy boat!',
    ],
    tammyRebuttals: [
      'Mom, launching five pounds of wet stoneware into an art teacher’s coffee is how you get banned from the community center!',
      'Mom, please do not give Dad ideas about a V8-powered pottery wheel, the garage walls still have marks from the apple cider press!',
      'Centering clay takes years of centrifugal muscle memory, Mom, it is not the same as icing a bundt cake!',
      'Even a lopsided gravy boat has artisanal charm if you call it rustic organic minimalism and charge $85!',
      'Mom, you don’t need baking soda when you make beaded jewelry—zero mud, 100% sparkle!',
    ],
    interruptions: [
      '—Wait, did he just pull the vase rim up six inches with two fingers?!—',
      '—Mom, stop, the instructor’s coffee mug story is legendary!—',
      '—Hold on, look how glossy that wet clay looks under the studio lights!—',
      '—Pause right there, a lawnmower-powered pottery wheel would break the sound barrier!—',
    ],
    punchlines: [
      'All the handmade artistry with zero flying mud! Tap below for our handcrafted "{TITLE}"!',
      'Skip the messy clay wheel and treat yourself to Bonnie’s sparkling "{TITLE}" at btboutiqe.com!',
      'Spun with love and balanced to perfection! Grab your handmade "{TITLE}" today!',
      'Artisan craftsmanship that won’t ruin your apron! Snag our "{TITLE}" before it’s gone!',
    ],
  },
  {
    scene: 'glassblowing_lava',
    clipFile: 'glassblowing_lava.mp4',
    animal: 'Molten Glassblowing Furnace',
    hooks: [
      'Mom, look at the shop TV! They are pulling 2,000-degree molten glass out of a roaring furnace like glowing honey!',
      'Check the monitor, Mom! This master glassblower is shaping liquid fire on the end of a steel blowpipe!',
      'Mom, look at that orange glow on the screen! That molten crystal looks like forbidden marmalade straight from a volcano.',
      'Watch Channel 42, Mom! They are rolling white-hot molten glass across a steel marver table!',
      'Mom, hurry! The glassblowing studio on TV is turning liquid magma into a crystal goblet right before our eyes!',
    ],
    grandmaTwists: [
      'Good heavens, Tammy! That looks just like the roof of your mouth when you bite into a fresh pizza pocket too fast!',
      'Look at that glowing orange blob! It looks like my homemade peach cobbler filling when it comes out of the oven at 425 degrees!',
      'Bless his eyebrows! Working next to a 2,000-degree oven all day—he wouldn’t even need a hair dryer in the winter!',
      'Tammy, I love how it glows! That is the exact shade of sunset amber we use in our lampwork glass focal beads!',
      'Don’t touch it without oven mitts, young man! One drop of that on the linoleum and it’s going straight through to the basement!',
    ],
    tammyRebuttals: [
      'Mom, oven mitts from the grocery store will vaporize on contact with 2,100-degree molten soda-lime silica!',
      'Comparing industrial glassblowing furnaces to a microwave pizza pocket is peak grandma physics!',
      'Mom, it truly looks like forbidden orange marmalade, it takes every ounce of my willpower not to want to poke it with a spoon!',
      'And yes, that is literally how our lampwork glass beads get their permanent internal swirl—minus the giant blowpipe!',
      'Mom, if your peach cobbler ever glows neon incandescent orange, we are calling the fire department immediately!',
    ],
    interruptions: [
      '—Wait, did he just cut liquid glass with a pair of diamond shears?!—',
      '—Mom, forbidden peach cobbler has me crying laughing!—',
      '—Hold up, look how the color shifts from lava orange to crystal clear as it cools!—',
      '—Stop right there, oven mitts are NOT rated for magma, Mom!—',
    ],
    punchlines: [
      'Forged in passion without the 2,000-degree furnace! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Red-hot style that stays cool in your hand! Tap the link for Bonnie’s "{TITLE}"!',
      'Glowing artisan beauty ready for your collection! Pick up our handcrafted "{TITLE}" today!',
      'No blowpipe or oven mitts required! Treat yourself to our sparkling "{TITLE}" now!',
    ],
  },
  {
    scene: 'skateboarding_tricks',
    clipFile: 'skateboarding_tricks.mp4',
    animal: 'Street Skateboarding Championship',
    hooks: [
      'Mom, look at the shop TV! The Tokyo Street Skateboarding Championship is on and that skater just landed a backside kickflip down a 12-stair rail!',
      'Check the monitor, Mom! This pro skateboarder just launched six feet into the air and ground across a concrete ledge!',
      'Mom, watch the screen! That kid on the skateboard has zero fear of gravity and +50,000 street cred!',
      'Channel 42 sports update: A street skater just spun his board 360 degrees under his feet in mid-air and stuck the landing!',
      'Mom, look! They are doing technical skateboard grinds down steel handrails at 25 miles an hour!',
    ],
    grandmaTwists: [
      'Oh my knees hurt just watching that, Tammy! Where are his elbow pads and his mother’s insurance card?!',
      'Look at that balance! That is me walking across the icy driveway in February carrying two bags of birdseed and a Pyrex casserole!',
      'Bless his ankles! If he skates past our boutique that fast, the breeze will blow the price tags right off the counter!',
      'Why is he sliding down the handrail on a wooden plank?! The janitor worked very hard polishing that banister!',
      'Tammy, he spun around twice in the air! If I spin around once in the kitchen, I forget why I opened the pantry!',
    ],
    tammyRebuttals: [
      'Mom, that is an Olympic-grade street skatepark in Tokyo, there is no janitor polishing the grind rails with Pledge!',
      'Comparing a tre-flip down a 12-stair set to carrying a tuna casserole across black ice is honestly accurate though!',
      'Mom, pro skaters have ankles made of carbon fiber and rubber bands, physics does not apply to them!',
      'Please do not try grinding the porch handrail with your Pyrex dish, Mom, I cannot explain that at Urgent Care!',
      'If spinning in the kitchen was an Olympic sport, Mom, you and your teacup would take home the gold medal!',
    ],
    interruptions: [
      '—Wait, did the board just flip twice under his sneakers in slow motion?!—',
      '—Mom, not the janitor polishing the skatepark handrail!—',
      '—Hold on, carrying a Pyrex casserole on ice really IS an extreme sport!—',
      '—Stop, look at the crowd losing their minds on that landing!—',
    ],
    punchlines: [
      '10/10 landing every single time! Flip over to btboutiqe.com for our handmade "{TITLE}"!',
      'Gold-medal style with zero scraped knees! Tap below for Bonnie’s handcrafted "{TITLE}"!',
      'Roll through your week with championship flair! Snag our "{TITLE}" today!',
      'Smooth tricks, smoother craftsmanship! Grab your handmade "{TITLE}" before it rolls away!',
    ],
  },
  {
    scene: 'roller_coaster_pov',
    clipFile: 'roller_coaster_pov.mp4',
    animal: 'Vertical Drop Roller Coaster POV',
    hooks: [
      'Mom, look at the shop TV! It’s a front-row POV camera on a 90-degree vertical drop roller coaster and my stomach just left the building!',
      'Hold onto the counter, Mom! The TV is showing a steel roller coaster cresting the top of a 150-foot vertical tower!',
      'Mom, watch the monitor! This roller coaster goes straight down at 60 miles per hour into a cobra roll loop!',
      'Check out Channel 42, Mom! Front-seat roller coaster footage where the track literally disappears underneath you!',
      'Mom, look at the screen! We are watching a high-G steel coaster dive upside down without leaving the boutique!',
    ],
    grandmaTwists: [
      'Lord have mercy, Tammy, turn it down—I’m gripping the edge of the oak counter so hard my knuckles are white!',
      'Why on earth do people pay sixty dollars to be dropped off a ten-story building in a shopping cart?!',
      'The last roller coaster I rode was the wooden cyclone in 1974, and my beehive hairdo came out looking like a dandelion in a wind tunnel!',
      'If you took me on that contraption, Tammy, my spectacles would land in the next county and my purse would be in orbit!',
      'That looks exactly like how your father drives down the mountain pass when he sees a half-price hardware sale!',
    ],
    tammyRebuttals: [
      'Mom, you are standing on a solid hardwood floor in the boutique and you are literally leaning 45 degrees to the left!',
      'A multi-million-dollar tubular steel coaster with magnetic eddy-current brakes is slightly safer than a shopping cart, Mom!',
      'To be fair, Dad driving toward a clearance sale on socket wrenches pulls at least 4.5 lateral Gs!',
      'Mom, your 1974 beehive hairdo had enough Aqua Net hairspray to survive atmospheric re-entry!',
      'See, this is why we clip our keychains with heavy-duty lobster clasps—even a loop-de-loop couldn’t shake them loose!',
    ],
    interruptions: [
      '—Wait, why are WE both leaning sideways behind the counter right now?!—',
      '—Mom, stop, a shopping cart off a ten-story building has me wheezing!—',
      '—Hold on, it just went through three inversions in five seconds!—',
      '—Excuse me, Dad’s mountain pass driving really IS a thrill ride!—',
    ],
    punchlines: [
      'All the thrill with your feet firmly on the ground! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Hold onto your sparkle through every loop-de-loop! Tap below for Bonnie’s "{TITLE}"!',
      'Buckle up for pure boutique joy! Pick up our handcrafted "{TITLE}" today!',
      'Zero G-forces, 100% excitement! Snag your very own "{TITLE}" in the shop now!',
    ],
  },
  {
    scene: 'espresso_latte_art',
    clipFile: 'espresso_latte_art.mp4',
    animal: 'Barista Latte Art Rosette',
    hooks: [
      'Mom, look at the shop monitor! This barista is pouring steamed micro-foam milk into espresso to paint a 16-leaf rosette!',
      'Check the TV, Mom! That velvet latte art pour is so symmetrical it belongs in an art museum!',
      'Mom, watch this espresso pour on Channel 42! The contrast between the dark crema and silky milk foam is pure magic.',
      'Look at the screen, Mom! A master barista is wiggling the milk pitcher to draw a tulip flower right on top of the coffee!',
      'Mom, hurry! It’s coffee hour on the shop TV and that latte art rosette is perfection!',
    ],
    grandmaTwists: [
      'Oh, isn’t that fancy! When your father pours cream into his morning coffee, it looks like a thunderstorm over Lake Erie!',
      'Tammy, if a barista drew a flower that pretty in my cup, I’d feel guilty drinking it—I’d try to press it in a dictionary!',
      'Look at the wrist wiggle on that pour! That is the exact technique I use when drizzling lemon glaze over warm scones!',
      'Seven dollars for a cup of coffee with a swan on top?! For seven dollars, that swan better fold my laundry too!',
      'Bless their heart, it is lovely! Though nothing beats a steaming mug of cinnamon spice tea right here at the crafting table.',
    ],
    tammyRebuttals: [
      'Mom, please do not pour hot espresso into the family dictionary to preserve a milk foam flower!',
      'Dad’s coffee routine is two scoops of dark roast and a splash of half-and-half from three feet in the air!',
      'Mom, steaming milk to 140 degrees with microscopic air bubbles is fluid dynamics art, let me enjoy my $7 oat latte!',
      'Okay, drizzling lemon glaze over warm scones is actually top-tier culinary latte art, I will give you that one!',
      'And unlike a latte that disappears in five minutes, our handmade boutique treasures stay gorgeous on your desk forever!',
    ],
    interruptions: [
      '—Wait, did they just draw the stem and leaves with a single pull-through?!—',
      '—Mom, do NOT put liquid cappuccino inside Webster’s Dictionary!—',
      '—Hold on, "a thunderstorm over Lake Erie" is the funniest coffee description ever!—',
      '—Stop, now I desperately want both a warm scone and an iced latte!—',
    ],
    punchlines: [
      'Pair your morning coffee with artisan sparkle! Tap below for our handmade "{TITLE}"!',
      'Crafted with more love than a barista’s best rosette! Grab "{TITLE}" at btboutiqe.com!',
      'Lasts way longer than a $7 latte! Treat yourself to Bonnie’s handcrafted "{TITLE}" today!',
      'Brewed for cozy vibes and everyday charm! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    scene: 'lava_flow_volcano',
    clipFile: 'lava_flow_volcano.mp4',
    animal: 'Icelandic Volcanic Lava Flow',
    hooks: [
      'Mom, look at the shop TV! Drone footage of the Litli-Hrútur volcano erupting in Iceland with rivers of glowing magma!',
      'Check out Channel 42, Mom! A literal fissure of molten earth is bubbling across the Icelandic moss fields!',
      'Mom, watch the monitor! That volcanic crater is fountain-spraying liquid rock 300 feet into the twilight sky!',
      'Look at the shop screen, Mom! Bright neon magma is carving a glowing canyon through black basalt rock!',
      'Mom, hurry over! The volcano footage on TV looks like the forging of a mythical ring in Middle-earth!',
    ],
    grandmaTwists: [
      'Good gracious, Tammy! Mother Nature left the stove burner on high and forgot to set the kitchen timer!',
      'That glowing river looks just like the time I dropped a jar of strawberry rhubarb jam on the heated kitchen tiles!',
      'Imagine the heating bill savings in Iceland! You could toast marshmallows from three miles away with a very long stick!',
      'Tammy, look at those vivid crimson and gold veins against the dark rock—that is a masterclass in color contrast!',
      'Just don’t step in that with your good Sunday shoes, honey, the rubber soles will never recover!',
    ],
    tammyRebuttals: [
      'Mom, stepping into a 2,200-degree basaltic lava flow is slightly more concerning than scuffed Sunday loafers!',
      'You cannot roast a marshmallow over a tectonic plate fissure, Mom, the sulfur dioxide will ruin the graham cracker!',
      '"Mother Nature left the burner on high" is honestly the best geological summary of Iceland I have ever heard!',
      'And you’re right—that volcanic gold-and-obsidian palette is genuinely inspiring for our metallic bead collections!',
      'Wait until you tell Dad about geothermal heating, he’ll be digging a trench in the backyard by 4 PM!',
    ],
    interruptions: [
      '—Wait, did a boulder of solid rock just float downstream on liquid magma?!—',
      '—Mom, please do not try roasting s’mores over an active volcanic crater!—',
      '—Hold up, "scuffed Sunday loafers" in a lava field has me rolling!—',
      '—Stop right there, look at the sheer scale of that glowing river!—',
    ],
    punchlines: [
      'Erupting with style and volcanic brilliance! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Hotter than Icelandic magma, safe for your Sunday shoes! Tap below for "{TITLE}"!',
      'Earth-shaking beauty handcrafted just for you! Pick up Bonnie’s "{TITLE}" today!',
      'Bring home a spark of pure creative fire! Snag your handmade "{TITLE}" now!',
    ],
  },
  {
    scene: 'fireworks_finale',
    clipFile: 'fireworks_finale.mp4',
    animal: 'Grand Finale Fireworks Show',
    hooks: [
      'Mom, look at the shop TV! They are broadcasting a massive grand finale fireworks show exploding in gold and magenta across the night sky!',
      'Check the monitor, Mom! Twenty chrysanthemum shells just burst simultaneously in shimmering cascades of glitter!',
      'Mom, watch the screen! The fireworks finale is lighting up the entire horizon like a giant jewelry box in the clouds!',
      'Channel 42 celebration broadcast: Golden willow fireworks are raining sparkles down over the riverfront!',
      'Mom, look! Every color in the spectrum is popping off on the shop TV in full high-definition sparkle!',
    ],
    grandmaTwists: [
      'Ooh, aah! Tammy, look at that purple willow burst—it matches our amethyst rhinestone spacer beads to perfection!',
      'I love a good fireworks show, as long as I’m watching from a lawn chair with a cardigan and a thermos of hot cocoa!',
      'Remember when your uncle tried setting off a fountain sparkler in the driveway and set the petunia planter spinning?!',
      'It’s like the sky is putting on its finest diamond brooch just to say goodnight to the town!',
      'All that glitter in the air and nobody even has to vacuum the carpet afterward! Now that is a miracle!',
    ],
    tammyRebuttals: [
      'Mom, you are the only person on earth who watches a pyrotechnics display and color-matches it to rhinestone inventory!',
      'Uncle Gary’s driveway sparkler incident is still talked about by the neighborhood association fifteen years later!',
      'Honestly, glitter that you don’t have to vacuum out of the rug six months later IS the greatest invention in human history!',
      'Look at that double-ring peony shell—if we turned that exact burst into a beaded pen, it would sell out in three minutes!',
      'Grab your cardigan and cocoa, Mom, because our boutique sparkle lasts way longer than a three-second firework shell!',
    ],
    interruptions: [
      '—Wait, did that shell just burst into a giant glittering heart in the sky?!—',
      '—Mom, not Uncle Gary and the spinning petunia planter!—',
      '—Hold on, zero-cleanup sky glitter is genuinely a 10/10 concept!—',
      '—Stop, look at the gold cascade reflecting off the water!—',
    ],
    punchlines: [
      'Grand finale sparkle that never fades from the sky! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Dazzle like the Fourth of July every single day! Tap below for Bonnie’s "{TITLE}"!',
      'All the fireworks, zero carpet vacuuming required! Pick up our "{TITLE}" today!',
      'Light up the room with handcrafted brilliance! Snag your "{TITLE}" in the shop!',
    ],
  },
  {
    scene: 'campfire_marshmallows',
    clipFile: 'campfire_marshmallows.mp4',
    animal: 'Cozy Crackling Campfire',
    hooks: [
      'Mom, look at the shop TV! They put on the 4K cozy crackling campfire channel with glowing birch logs and floating embers!',
      'Check the monitor, Mom! A warm woodland campfire is flickering under the stars and the vibes in the shop just hit 100% cozy.',
      'Mom, watch the screen! Those golden campfire flames dancing over seasoned oak logs are making me want s’mores immediately.',
      'Channel 42 cozy hour: Pure crackling campfire warmth radiating right from the vintage TV above our counter!',
      'Mom, look! The shop monitor is beaming a roaring hearth fire and my stress levels just dropped to absolute zero.',
    ],
    grandmaTwists: [
      'Oh, I can practically smell the toasted marshmallows and pine needles from here, Tammy! Pass me my quilting shawl!',
      'There are two types of marshmallow roasters in this world: patient golden-brown artisans like me, and human blowtorches like you!',
      'Look at those warm amber embers! Nothing brings folks together like a crackling fire and a good story before bedtime.',
      'Best part about a campfire on the television? Your sweater doesn’t smell like hickory smoke for the next three washes!',
      'If we put a pot of spiced apple cider on the counter right now, customers will never want to leave the boutique!',
    ],
    tammyRebuttals: [
      'Mom, setting the marshmallow on fire for three seconds and blowing it out creates a caramelized carbon crust, it is culinary science!',
      'You take twelve full minutes rotating a single marshmallow at 4 RPM like a rotisserie chicken, Mom!',
      'Okay, getting all the cozy campfire ambiance without smelling like a smoked brisket for three days is a massive win!',
      'Combined with our ambient piano music and handmade crafts, this boutique is officially the coziest corner of the internet!',
      'Let’s pour the spiced cider—anyone who orders today gets 100% of this warm hearthside energy packed right into their box!',
    ],
    interruptions: [
      '—Wait, did a little spark just pop and float straight up the screen?!—',
      '—Mom, my charred marshmallow technique is elite and I stand by it!—',
      '—Hold on, "rotating a marshmallow at 4 RPM" is literally what you do!—',
      '—Stop, I am officially putting spiced apple cider on the counter tomorrow!—',
    ],
    punchlines: [
      'Gather around the cozy glow! Warm up your day with our handmade "{TITLE}" at btboutiqe.com!',
      'Golden-toasted perfection in every bead! Tap below for Bonnie’s "{TITLE}"!',
      'Cozy hearthside charm without the campfire smoke! Pick up our "{TITLE}" today!',
      'Crafted with warmth, love, and a dash of sparkle! Snag your "{TITLE}" now!',
    ],
  },
  {
    scene: 'cat_playing_box',
    clipFile: 'cat_playing_box.mp4',
    animal: 'Chaotic Cat in a Cardboard Box',
    hooks: [
      'Mom, look at the shop TV! This housecat has a $200 velvet cat tree behind him and he is diving headfirst into an empty shipping box!',
      'Check the monitor, Mom! A tabby cat is trying to squeeze all 14 pounds of fluff into a shoe-sized cardboard box!',
      'Mom, watch Channel 42! This cat just rabbit-kicked a cardboard flap like it owes him money!',
      'Look at the screen, Mom! The cat is peeking over the edge of a packing box with wild zoomie eyes!',
      'Mom, hurry! This cat in a cardboard box is acting just like our boutique supervisor during shipping hour!',
    ],
    grandmaTwists: [
      'Oh bless his fuzzy paws! Every time I open a carton of shipping boxes in the back room, Barnaby jumps in before I can tape the bottom!',
      'Why is it that cats treat a free brown corrugated box like a five-star luxury penthouse at the Plaza Hotel?!',
      'Look at his little ears sticking out the top! If he fits, he sits—even if half his tummy is spilling over the side!',
      'Tammy, make sure you check every single package before we take it to the post office so we don’t accidentally mail a kitty!',
      'He is inspecting the cardboard seam thickness! That cat takes packaging quality control almost as seriously as I do!',
    ],
    tammyRebuttals: [
      'Mom, "If I fits, I sits" is the first law of feline thermodynamics—cats are legally classified as a liquid!',
      'You buy them orthopedic memory-foam beds and they choose an Amazon box that held bulk bubble mailers!',
      'Don’t worry, Mom, every Bonnie’s Boutique box is strictly inspected for stowaway paws before the pink tissue paper goes in!',
      'Look at his pupils dilate to the size of dinner plates—he is about to launch into orbit across the living room!',
      'Honestly, our customers get that exact same burst of pure excitement when they open our shipping boxes too!',
    ],
    interruptions: [
      '—Wait, did he just do a somersault inside the box and pop right back up?!—',
      '—Mom, cats really ARE a liquid, look how he poured himself into that corner!—',
      '—Hold on, checking packages for stowaway kitties is a mandatory boutique rule!—',
      '—Stop, those dinner-plate zoomie eyes mean total chaos in 3, 2, 1!—',
    ],
    punchlines: [
      'Unbox pure joy (stowaway cat not included)! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Five-star unboxing happiness in every package! Tap below for Bonnie’s "{TITLE}"!',
      'Purr-fectly handcrafted and packed with love! Pick up your "{TITLE}" today!',
      'Jump into sparkle with our one-of-a-kind "{TITLE}"—shipping fresh from the boutique!',
    ],
  },
  {
    scene: 'chameleon_glow',
    clipFile: 'chameleon_glow.mp4',
    animal: 'Iridescent Rainforest Chameleon',
    hooks: [
      'Mom, look at the shop monitor! This rainforest chameleon is shifting from emerald green to electric turquoise while walking on a branch!',
      'Check Channel 42, Mom! That chameleon’s eyes are swiveling in two completely independent directions at once!',
      'Mom, watch the TV! He walks with a little back-and-forth leaf wobble before locking onto his target!',
      'Look at the colors on that chameleon, Mom! He’s wearing every shade of iridescent bead we have in the boutique!',
    ],
    grandmaTwists: [
      'Oh my stars, Tammy! If I had eyes that swiveled two ways at once, I could watch my knitting AND the oven timer simultaneously!',
      'Look at that little two-step rock he does with his mittens! He walks like he’s testing a squeaky porch floorboard!',
      'Bless his colorful heart! He changes outfits faster than you did before your junior high school picture day!',
      'That shimmer on his scales is the exact color-shift sheen on our mermaid aura glass beads!',
    ],
    tammyRebuttals: [
      'Mom, chameleons change color using nanocrystal lattices in their skin to express mood, not for junior high picture day!',
      'Though having 360-degree turret eyes would make finding dropped seed beads on the craft room carpet 100 times easier!',
      'His little leaf-imitation wobble walk is genuinely the cutest locomotion in the reptile kingdom!',
      'And yes, he is basically a walking, breathing ambassador for our iridescent color-shift collection!',
    ],
    interruptions: [
      '—Wait, did his left eye look at the camera while his right eye looked at a cricket?!—',
      '—Mom, not the junior high picture day outfit changes!—',
      '—Hold on, look at his curled-up tail spiraling like a cinnamon roll!—',
      '—Stop, that turquoise-to-gold color shift is mesmerizing!—',
    ],
    punchlines: [
      'Shift your style into full iridescent colour! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Color-changing magic you can hold in your hand! Tap below for Bonnie’s "{TITLE}"!',
      'Stand out on every branch with our handcrafted "{TITLE}" today!',
      'Eye-catching sparkle from every angle! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    scene: 'red_panda_snack',
    clipFile: 'red_panda_snack.mp4',
    animal: 'Bamboo-Munching Red Panda',
    hooks: [
      'Mom, look at the shop TV! A fluffy red panda is sitting in an autumn tree holding a bamboo shoot with both paws like a flute!',
      'Check the monitor, Mom! This red panda has a ringed tail as big as a bolster pillow and the happiest munching face ever!',
      'Mom, watch Channel 42! The red panda is snacking on sweet fruit slices in the golden leaves with zero worries!',
      'Look at those fluffy white ears on the screen, Mom! That red panda is 90% cinnamon fur and 10% snack appetite!',
    ],
    grandmaTwists: [
      'Oh, sweet cinnamon bun! Look how politely he holds his snack with both mittens—better table manners than half the town picnic!',
      'Look at that gorgeous auburn coat and fluffy striped tail! I want to brush him with a soft bristle comb and give him an apple slice!',
      'Tammy, he looks just like a living teddy bear who dipped his tail in a pot of cinnamon sugar!',
      'If he sat on our boutique counter munching bamboo, customers would tip him in apple wedges all afternoon!',
    ],
    tammyRebuttals: [
      'Mom, red pandas have false thumbs specifically evolved for gripping bamboo—though he really does look like he’s eating a biscotti!',
      'Calling a Himalayan mammal a "sweet cinnamon bun" is scientifically inaccurate but spiritually 100% true!',
      'Look at him wrap his own tail around his toes like a built-in winter scarf—that is peak cozy engineering!',
      'Until we get a resident red panda, our cozy autumn-inspired handmade pieces will have to carry the cuteness!',
    ],
    interruptions: [
      '—Wait, did he just stand up on his hind legs to reach a higher branch?!—',
      '—Mom, "dipped his tail in cinnamon sugar" is adorable!—',
      '—Hold on, look at his little ears wiggle every time he chews!—',
      '—Stop, a built-in tail blanket is the ultimate winter upgrade!—',
    ],
    punchlines: [
      'Wrap your day in five-star cozy charm! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Sweet as a cinnamon bun and twice as sparkling! Tap below for Bonnie’s "{TITLE}"!',
      'Treat yourself to adorable handcrafted joy with our "{TITLE}" today!',
      '100% wholesome boutique vibes! Snag your very own "{TITLE}" now!',
    ],
  },
  {
    scene: 'sea_otter_drift',
    clipFile: 'sea_otter_drift.mp4',
    animal: 'Floating Sea Otter',
    hooks: [
      'Mom, look at the shop TV! A sea otter is floating on his back in the kelp forest patting his own cheeks like he’s doing a skincare routine!',
      'Check out Channel 42, Mom! This sea otter has a favorite little rock tucked into his underarm pocket for cracking clams!',
      'Mom, watch the monitor! The otter is bobbing on the ocean swells wrapped in kelp so he doesn’t drift away during his nap!',
      'Look at the screen, Mom! That sea otter has one million hairs per square inch and is living his best floating spa life!',
    ],
    grandmaTwists: [
      'Oh bless his whiskers! He has a built-in pocket just for his favorite pebble?! That is a creature after my own heart!',
      'Look how he pats his little cheeks! That is me applying my rosewater night cream before bed!',
      'Wrapping himself in a ribbon of kelp so he doesn’t float off during his afternoon nap is pure grandma wisdom!',
      'Tammy, if I had a favorite rock in my apron pocket for forty years, I’d polish it until it sparkled like a gemstone!',
    ],
    tammyRebuttals: [
      'Mom, sea otters literally do keep the same favorite tool rock in their skin pouch for years—they are the original trinket collectors!',
      'His 10-step ocean water facial routine puts every beauty influencer on the internet to shame!',
      'Anchoring yourself in giant kelp so you can nap in the Pacific Ocean without drifting to Hawaii is genius-level lazy!',
      'And since humans don’t have built-in underarm rock pockets, that’s why we make dazzling keychains and wristlets!',
    ],
    interruptions: [
      '—Wait, did he just juggle his favorite pebble across his tummy?!—',
      '—Mom, sea otters really ARE the original trinket collectors!—',
      '—Hold on, the rosewater night cream cheek-pat is spot on!—',
      '—Stop, look how he tucked his back flippers up out of the cold water!—',
    ],
    punchlines: [
      'Every collector needs a favorite treasure! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Float through your day with cozy sparkle! Tap below for Bonnie’s "{TITLE}"!',
      'Better than a pocket pebble—treat yourself to our handcrafted "{TITLE}" today!',
      'Pure ocean-breeze joy in your hands! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    scene: 'curious_owl',
    clipFile: 'curious_owl.mp4',
    animal: 'Curious Saw-Whet Owl',
    hooks: [
      'Mom, look at the shop TV! This tiny saw-whet owl is tilting his head 90 degrees sideways with giant golden anime eyes!',
      'Check the monitor, Mom! An owl no bigger than a teacup is blinking in slow motion from a pine branch!',
      'Mom, watch Channel 42! That little owl just rotated his head 270 degrees like a feathered periscope!',
      'Look at the shop screen, Mom! Those huge golden eyes are staring right through the camera lens into my soul!',
    ],
    grandmaTwists: [
      'Oh my goodness, Tammy, he is the size of a baked potato with feathers! Look at that curious little head tilt!',
      'That is the exact look I give your father when he says he can fix the leaky kitchen faucet without calling a plumber!',
      'Bless his heart, he stays up all night long hooting in the pines—just like me when I get on a midnight crafting roll!',
      'Look at those round golden eyes! They gleam just like our tiger-eye and amber crystal beads under the shop lamp!',
    ],
    tammyRebuttals: [
      'Mom, "a baked potato with feathers" is the most accurate measurement of a Northern saw-whet owl ever recorded!',
      'The skeptical head-tilt when Dad brings out the duct tape for a plumbing job is universal across all species!',
      'Owls have asymmetrical ear openings so tilting their head lets them triangulate a mouse under two feet of snow!',
      'And whether you’re a night owl or an early bird, our handmade treasures are guaranteed to make your eyes light up just like his!',
    ],
    interruptions: [
      '—Wait, did he just tilt his head completely upside down to look at a pine cone?!—',
      '—Mom, "a baked potato with feathers" has me in stitches!—',
      '—Hold on, the Dad plumbing head-tilt is 100% accurate!—',
      '—Stop, look at his tiny feathered toes gripping the bark!—',
    ],
    punchlines: [
      'For every night owl who loves a little sparkle! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Wise, wonderful, and handcrafted with love! Tap below for Bonnie’s "{TITLE}"!',
      'Turn heads (up to 270 degrees) with our dazzling "{TITLE}" today!',
      'Bright-eyed boutique charm ready to ship! Snag your "{TITLE}" now!',
    ],
  },
  {
    scene: 'studio_makeover_spruce',
    clipFile: 'studio_makeover_spruce.mp4',
    animal: 'Big Boutique Spruce-Up & Promotion',
    hooks: [
      'Mom, hold the phone—did we just get a full HD graphics spruce-up and a dynamic camera crew in the boutique?!',
      'Wait a minute, Mom! Look at the studio monitor—we got a massive boutique makeover, an arched window, and a promotion!',
      'Mom, check yourself out! You’ve got vintage gold reading glasses, a pearl necklace, and 3-tone copper highlights!',
      'Breaking news on Channel 42, Mom: Bonnie’s Boutique just leveled up to deluxe high-definition pixel craftsmanship!',
      'Mom, look at how smooth the camera pans when we talk now! We officially got promoted to prime-time television!',
    ],
    grandmaTwists: [
      'Oh my stars, Tammy! Look at my scalloped lace apron and my gold spectacles—I feel like I just got promoted to CEO of Cozy!',
      'We certainly did get a spruce-up, honey! I polished the mahogany counter, lit a beeswax candle, and Barnaby the cat claimed the window sill!',
      'With this fancy new camera zooming in on us, I’m promoting myself to Chief Tea & Trinket Officer effective immediately!',
      'Look at our new arched window and swinging pendulum clock! Even the neighbors across the street turned their lights on to watch!',
      'I told you if we kept hand-making every treasure with love, we’d get a big boutique upgrade! How does my hairclip look in high definition?!',
    ],
    tammyRebuttals: [
      'Mom, your rose hairclip is gleaming in 1080p, and I am officially promoting myself to Vice President of Sparkle & Camera Angles!',
      'Look at the dynamic camera panning between us while the Shop TV plays live reaction feeds—our production value just went +10,000 aura!',
      'Barnaby swishing his tail on the window sill while the teapot steams on the counter is peak cozy boutique aesthetics!',
      'Does my promotion to Executive Director of Banter come with a raise, or do I get paid in warm scones and handmade pens?!',
      'Honestly, seeing our boutique spruced up like this makes our handmade creations on the counter shine brighter than ever!',
    ],
    interruptions: [
      '—Wait, did the camera just pan right over to me while my honey highlights caught the lantern light?!—',
      '—Mom, "Chief Tea & Trinket Officer" is going on your business cards tomorrow!—',
      '—Hold on, look at Barnaby blinking at us from the arched window ledge!—',
      '—Stop right there, this boutique spruce-up is officially our best era yet!—',
    ],
    punchlines: [
      'Celebrate our big boutique spruce-up and promotion! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'New look, same handmade grandma love! Tap below for Bonnie’s "{TITLE}"!',
      'Promoted to S-Tier sparkle! Treat yourself to our handcrafted "{TITLE}" in the newly upgraded shop!',
      'Come tour the spruced-up boutique and snag your very own "{TITLE}" today!',
    ],
  },
  {
    scene: 'cake_decorating_icing',
    clipFile: 'cake_decorating_icing.mp4',
    animal: 'Spinning Cake Frosting Turntable',
    hooks: [
      'Mom, look at the Shop TV! A pastry chef is piping buttercream rosettes onto a spinning cake turntable at lightning speed!',
      'Check the monitor, Mom! They are smoothing pastel frosting with an offset spatula and it is 100% hypnotic!',
      'Mom, watch Channel 42! That three-tier cake is getting a mirror-glaze waterfall and rainbow sprinkles!',
      'Look at the screen, Mom! The precision on that buttercream piping bag is top-tier culinary engineering!',
    ],
    grandmaTwists: [
      'Oh, my sweet tooth is tingling just watching that, Tammy! When I frost a birthday cake, half the buttercream ends up on my knuckles!',
      'Look at how smoothly that turntable spins! If I spun a cake that fast in our kitchen, there’d be vanilla icing on the ceiling fan!',
      'Those little sugar pearls they’re placing with tweezers remind me of stringing our tiniest pastel seed beads!',
      'Bless the baker’s heart, that cake is almost too pretty to slice—almost, until someone pours a hot cup of coffee!',
    ],
    tammyRebuttals: [
      'Mom, licking the leftover buttercream off the mixer beaters is the entire reason anyone volunteers to help you bake!',
      'Stringing pastel acrylic beads and piping buttercream rosettes honestly use the exact same wrist muscles!',
      'Except our handmade boutique charms have zero calories and won’t melt if you leave them on your desk in July!',
      'If we ever put a spinning cake turntable on the boutique counter, zero orders would get packed because we’d be eating frosting!',
    ],
    interruptions: [
      '—Wait, did they just pipe a full blooming rose in three seconds flat?!—',
      '—Mom, vanilla icing on the ceiling fan happened at least twice in the nineties!—',
      '—Hold on, zero-calorie pastel sparkle is the ultimate sweet treat!—',
      '—Stop, now I need a cupcake AND a new keychain!—',
    ],
    punchlines: [
      'Sweet as buttercream and lasts forever! Grab our handmade "{TITLE}" at btboutiqe.com!',
      'Treat yourself to zero-calorie boutique sparkle with Bonnie’s "{TITLE}"!',
      'Piped to perfection and handcrafted with love! Pick up your "{TITLE}" today!',
      'The icing on top of your week! Snag our dazzling "{TITLE}" in the shop!',
    ],
  },
  {
    scene: 'blacksmith_sparks',
    clipFile: 'blacksmith_sparks.mp4',
    animal: 'Glowing Anvil Blacksmith Forge',
    hooks: [
      'Mom, look at the Shop TV! A master blacksmith is hammering glowing white-hot iron on a steel anvil with showers of golden sparks!',
      'Check the monitor, Mom! Every strike of that forging hammer sends fireworks exploding across the workshop!',
      'Mom, watch Channel 42! They just quenched red-hot steel in a barrel of oil and a cloud of steam shot to the rafters!',
      'Look at the screen, Mom! That blacksmith is forging custom metalwork at 1,900 degrees Fahrenheit!',
    ],
    grandmaTwists: [
      'Merciful heavens, Tammy! That is how loud your father sounds in the garage when he’s trying to loosen one rusty lawnmower bolt!',
      'Look at all those golden sparks flying! I hope he’s wearing a leather apron and not my good linen dish towels!',
      'He’s putting some serious elbow grease into that metal! That’s how I feel when I’m crimping heavy-duty steel jump rings!',
      'All that fire and hammering just to make a horseshoe—imagine if he had to thread forty tiny crystal beads onto a wire!',
    ],
    tammyRebuttals: [
      'Mom, Dad vs. one rusty bolt in the garage involves three hammers, a can of WD-40, and forty-five minutes of dramatic sighing!',
      'Honestly, a medieval blacksmith would probably surrender after five minutes of trying to thread 2mm seed beads without glasses!',
      'We may not use a 200-pound iron anvil, Mom, but our stainless-steel clasps are forged to survive anything!',
      'Look at the glow on that steel—it’s the exact metallic luster on our gold and silver charm spacers!',
    ],
    interruptions: [
      '—Wait, did that hammer strike just light up the entire forge in gold?!—',
      '—Mom, Dad and the WD-40 can is a universal suburban documentary!—',
      '—Hold on, imagining a blacksmith threading tiny pink beads is hilarious!—',
      '—Stop right there, our hardware really IS anvil-tough!—',
    ],
    punchlines: [
      'Forged with artisan toughness and boutique charm! Grab "{TITLE}" at btboutiqe.com!',
      'Spark-worthy style without the 200-pound anvil! Tap below for Bonnie’s "{TITLE}"!',
      'Built strong and sparkling bright! Pick up your handcrafted "{TITLE}" today!',
      'Strike while the iron is hot—snag our one-of-a-kind "{TITLE}" now!',
    ],
  },
  {
    scene: 'woodturning_lathe',
    clipFile: 'woodturning_lathe.mp4',
    animal: 'High-Speed Woodturning Lathe',
    hooks: [
      'Mom, look at the Shop TV! A woodworker is carving a spinning walnut block on a high-speed lathe with ribbons of wood flying everywhere!',
      'Check the monitor, Mom! That rough tree log just turned into a mirror-smooth wooden bowl in thirty seconds!',
      'Mom, watch Channel 42! They are applying beeswax polish to the spinning wood grain and the shine is unreal!',
      'Look at the screen, Mom! The wood shavings are curling off the chisel like golden gift ribbons!',
    ],
    grandmaTwists: [
      'Oh, I can smell the fresh cedar and walnut sawdust from here, Tammy! Though my broom is trembling just looking at that floor!',
      'When your grandfather worked at his wood lathe in the basement, he’d come upstairs for dinner looking like a powdered donut!',
      'Look at how that beeswax brings out the warm honey grain! That’s the exact finish on our boutique counter!',
      'There is nothing quite like taking raw materials and turning them into something smooth and heirloom-quality by hand!',
    ],
    tammyRebuttals: [
      'Mom, coming upstairs from the workshop looking like a sawdust-covered powdered donut is the mark of a true artisan!',
      'That moment when the beeswax hits the spinning walnut and the grain pops in 4K is pure visual ASMR!',
      'And thankfully, our focal beads come pre-polished so we don’t have to sweep three bushels of wood shavings off the rug!',
      'Every handmade piece we craft has that exact same one-of-a-kind tactile satisfaction in your hand!',
    ],
    interruptions: [
      '—Wait, watch the shine appear the second the beeswax touches the spinning bowl!—',
      '—Mom, "a sawdust-covered powdered donut" has me howling!—',
      '—Hold on, those wood curls really DO look like curling ribbon!—',
      '—Stop, that smooth finish is 10/10 craftsmanship!—',
    ],
    punchlines: [
      'Polished to perfection with zero sawdust cleanup! Grab "{TITLE}" at btboutiqe.com!',
      'Heirloom-quality handmade charm! Tap below for Bonnie’s "{TITLE}"!',
      'Turned with care and crafted with love! Pick up your "{TITLE}" today!',
      'Smooth, tactile beauty for your everyday routine—snag "{TITLE}" now!',
    ],
  },
  {
    scene: 'northern_lights_aurora',
    clipFile: 'northern_lights_aurora.mp4',
    animal: 'Dancing Aurora Borealis Sky',
    hooks: [
      'Mom, look at the Shop TV! Time-lapse footage of the Northern Lights dancing in neon emerald and violet curtains across the Arctic sky!',
      'Check the monitor, Mom! The Aurora Borealis is rippling over snow-covered pines like glowing silk ribbons!',
      'Mom, watch Channel 42! Solar winds are painting the entire midnight sky in electric green and magenta!',
      'Look at the screen, Mom! That aurora borealis glow is lighting up our whole boutique in emerald and lavender!',
    ],
    grandmaTwists: [
      'Glory be, Tammy! It looks like the angels are shaking out a giant iridescent quilt across the stars!',
      'Look at those shimmering green and purple waves—if I could bottle that exact color, I’d put it in every bead tray we own!',
      'I’d love to see the Northern Lights in person, provided I can watch from inside a heated cabin with woolen socks and hot tea!',
      'Nature truly is the greatest artist of all, honey—though we do our very best to match her sparkle right here at the counter!',
    ],
    tammyRebuttals: [
      'Mom, "shaking out a giant iridescent quilt across the stars" is poetic gold, NASA needs to hire you immediately!',
      'Watching magnetospheric plasma storms from inside a heated cabin with wool socks is the only sensible way to do the Arctic!',
      'Look how the Shop TV’s CRT glow is bouncing that aurora violet right onto our mahogany counter and Barnaby’s whiskers!',
      'Good news: you don’t need a flight to Tromsø to get that aurora shimmer—our iridescent collection has it locked in!',
    ],
    interruptions: [
      '—Wait, did the entire sky just ripple from emerald green to deep violet?!—',
      '—Mom, NASA hiring you to describe space weather is my new dream!—',
      '—Hold on, look at the stars twinkling right through the glowing curtains!—',
      '—Stop, that color palette is pure magic!—',
    ],
    punchlines: [
      'Capture the magic of the Northern Lights in your hand! Grab "{TITLE}" at btboutiqe.com!',
      'Iridescent aurora sparkle—no Arctic parka required! Tap below for "{TITLE}"!',
      'Glowing with celestial charm! Pick up Bonnie’s handcrafted "{TITLE}" today!',
      'Bring a ribbon of starlight to your day with our "{TITLE}"!',
    ],
  },
  {
    scene: 'domino_chain_fall',
    clipFile: 'domino_chain_fall.mp4',
    animal: 'Giant Domino Chain Reaction',
    hooks: [
      'Mom, look at the Shop TV! Ten thousand colorful dominoes are toppling in a synchronized spiral chain reaction!',
      'Check the monitor, Mom! This kinetic domino tower just cascaded across an entire gymnasium floor without missing a single tile!',
      'Mom, watch Channel 42! The dominoes are revealing a giant rainbow mural as they click-clack down the line!',
      'Look at the screen, Mom! It took them forty hours to set up this domino run and it’s all falling in thirty glorious seconds!',
    ],
    grandmaTwists: [
      'Oh, my nerves can’t take the suspense, Tammy! What if somebody’s cat walks through the room on tile number nine thousand?!',
      'That sound reminds me of the time I accidentally knocked over one plastic bead organizer and six trays dominoed across the table!',
      'Bless their patience! Standing ten thousand little rectangles on end takes a steadier hand than threading a needle in the dark!',
      'It is mighty satisfying when every single piece clicks into place just the way you planned it!',
    ],
    tammyRebuttals: [
      'Mom, if Barnaby was in that gymnasium, that 10,000-domino pyramid would have lasted approximately four seconds!',
      'The Great Bead Tray Domino Incident of last November still has seed beads hiding under the baseboard heater!',
      'There is something deeply therapeutic about watching forty hours of precision engineering pay off in one continuous wave!',
      'And speaking of every piece clicking into place—look at how seamlessly our handmade beads line up on today’s featured treasure!',
    ],
    interruptions: [
      '—Wait, did the dominoes just climb a staircase and trigger a double spiral?!—',
      '—Mom, do NOT remind me of the Great Bead Tray Domino Incident!—',
      '—Hold on, Barnaby is literally watching the dominoes from the window sill right now!—',
      '—Stop, that final tower collapse was 10/10 satisfying!—',
    ],
    punchlines: [
      'Every bead lined up to perfection! Tap below for our handmade "{TITLE}" at btboutiqe.com!',
      'Set off a chain reaction of smiles with Bonnie’s handcrafted "{TITLE}"!',
      'Precision craft that never topples over! Pick up your "{TITLE}" today!',
      '100% satisfying handmade quality—snag your "{TITLE}" in the shop now!',
    ],
  },
  {
    scene: 'neon_tokyo_rain',
    clipFile: 'neon_tokyo_rain.mp4',
    animal: 'Rainy Midnight Neon Street',
    hooks: [
      'Mom, look at the Shop TV! It’s a midnight walk through rain-slicked Tokyo streets with neon signs reflecting in every puddle!',
      'Check the monitor, Mom! Pink, cyan, and gold neon lanterns are glowing through the evening rain like a lo-fi anime movie!',
      'Mom, watch Channel 42! The wet pavement is turning the city lights into a giant shimmering kaleidoscope!',
      'Look at the screen, Mom! Clear umbrellas and warm ramen shop lanterns glowing under the midnight rain!',
    ],
    grandmaTwists: [
      'Oh, look at all those bright electric colors reflecting on the wet street, Tammy! It looks like spilled jewel boxes on black velvet!',
      'I hope all those folks walking in the rain have sensible galoshes and a warm bowl of noodle soup waiting at home!',
      'You know I love a rainy evening—there is no better time to turn on our shop lanterns, pour hot tea, and make something bright!',
      'Those glowing pink and turquoise signs match our vibrant acrylic and rhinestone charms to a tee!',
    ],
    tammyRebuttals: [
      'Mom, "spilled jewel boxes on black velvet" is the most aesthetic description of cyberpunk Tokyo ever spoken!',
      'And yes, sensible galoshes plus hot ramen is elite rainy-night survival gear in any time zone!',
      'Combined with our ambient Minecraft piano music and the rain outside our own boutique window, the cozy vibes are off the charts!',
      'Let’s bring that electric neon-and-lantern glow straight to your keys or desk with today’s handmade piece!',
    ],
    interruptions: [
      '—Wait, look at how the neon pink reflection ripples when a taxi drives by!—',
      '—Mom, "spilled jewel boxes on black velvet" is pure poetry!—',
      '—Hold on, now I want hot noodle soup AND a cup of cinnamon tea!—',
      '—Stop, rainy night boutique vibes are undefeated!—',
    ],
    punchlines: [
      'Brighten any rainy day with electric sparkle! Grab "{TITLE}" at btboutiqe.com!',
      'Jewel-box brilliance handcrafted with love! Tap below for Bonnie’s "{TITLE}"!',
      'Cozy lantern warmth meets vibrant style! Pick up your "{TITLE}" today!',
      'Shine through the rain with our one-of-a-kind "{TITLE}"!',
    ],
  },
  {
    scene: 'hummingbird_hover',
    clipFile: 'hummingbird_hover.mp4',
    animal: 'Slow-Motion Hovering Hummingbird',
    hooks: [
      'Mom, look at the Shop TV! High-speed slow-motion footage of an iridescent hummingbird hovering at 60 wingbeats per second!',
      'Check the monitor, Mom! That tiny bird is flying backward and upside down in mid-air like a feathered helicopter!',
      'Mom, watch Channel 42! Every time the sunlight hits its throat feathers, they flash ruby red and emerald green!',
      'Look at the screen, Mom! Its wings are drawing a perfect figure-eight in the air while its head stays completely still!',
    ],
    grandmaTwists: [
      'Bless its tiny heart, Tammy! That little bird has more energy before breakfast than I have after three cups of espresso!',
      'We have two ruby-throated hummingbirds that visit the porch feeder every summer, and they guard it like tiny feathered dragons!',
      'Look at that head stabilization—he doesn’t budge a millimeter even while his wings are going ninety miles an hour!',
      'That jewel-toned shimmer on his feathers is the exact sparkle we look for when we pick out our faceted crystal beads!',
    ],
    tammyRebuttals: [
      'Mom, hummingbirds really ARE tiny iridescent dragons—they weigh less than a nickel and have zero fear of anything!',
      'Their figure-eight wing stroke generates lift on both the forward and backward beat, which is aerospace perfection!',
      'Honestly, you during holiday craft fair week move at approximately 60 wingbeats per second too, Mom!',
      'And just like a hummingbird’s feathers, our faceted boutique treasures catch the light from every single angle!',
    ],
    interruptions: [
      '—Wait, did he just hover straight backward in 1,000-fps slow motion?!—',
      '—Mom, "tiny feathered dragons" at the porch feeder is 100% accurate!—',
      '—Hold on, weighing less than a nickel with that much attitude is iconic!—',
      '—Stop, look at that ruby-and-emerald flash on the feathers!—',
    ],
    punchlines: [
      'Dazzling jewel-toned sparkle that catches every light! Grab "{TITLE}" at btboutiqe.com!',
      'High-flying charm handcrafted with love! Tap below for Bonnie’s "{TITLE}"!',
      'Tiny treasure, massive brilliance! Pick up your "{TITLE}" today!',
      'Add a flash of hummingbird magic to your day with our "{TITLE}"!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 2: CHAOTIC GRANDMA HOT TAKES (Spice & Sugar / Grandma Unfiltered)
// ─────────────────────────────────────────────────────────────────────────────
export interface HotTakeScenario {
  topic: string;
  hooks: string[];
  grandmaLogics: string[];
  tammyReactions: string[];
  interruptions: string[];
  punchlines: string[];
}

export const HOT_TAKE_SCENARIOS: HotTakeScenario[] = [
  {
    topic: 'Smart Refrigerators',
    hooks: [
      'Tammy, your father showed me a refrigerator with a computer screen on the door, and I am deeply offended.',
      'Tammy, explain to me why a milk box needs a Wi-Fi connection and a monthly subscription service.',
      'Tammy, the neighbor bought an icebox that sends text messages when you run low on provolone cheese.',
      'I was reading the paper this morning: people are buying $3,000 refrigerators that talk back to you!',
      'Tammy, why does an appliance whose only job is to stay cold need 16 gigabytes of internal memory?!',
    ],
    grandmaLogics: [
      'If my mayonnaise has something urgent to say to me, it can knock on the door with its own spoon!',
      'My mother kept butter in an earthenware crock in the cellar for forty years and nobody got hacked by Russian spies!',
      'The moment that icebox tells me I have eaten too many peach preserves, I am unplugging its motherboard!',
      'What happens when the internet goes out during a blizzard? Do the pork chops lock themselves in the freezer?!',
      'I don’t want a screen on my fridge! I want magnetic plastic alphabet letters and a coupon for canned peaches!',
    ],
    tammyReactions: [
      'Mom, the smart fridge lets you see if you need eggs while you are still standing at the supermarket!',
      'Mom, the Russian spies do not want your mayonnaise recipe, they have their own culinary problems!',
      'Nobody’s pork chops are locking themselves in the freezer, Mom, it is just an LED inventory tracker!',
      'Mom, the screen is so people can play Spotify playlists while chopping onions!',
      'Okay, but to be fair, getting a push notification saying "Your celery has expired" is emotionally damaging.',
    ],
    interruptions: [
      '—Wait, did you just threaten a refrigerator’s motherboard?!—',
      '—Mom, stop, you cannot keep butter in an ungrounded cellar anymore!—',
      '—Hold on, did you actually check the fridge price tag?!—',
      '—Excuse me, did you just say the mayonnaise is going to knock?!—',
    ],
    punchlines: [
      'Keep your kitchen simple! Our handmade "{TITLE}" requires zero Wi-Fi, zero software updates, just pure charm!',
      'No smart fridge required! Grab our dependable, handcrafted "{TITLE}" at btboutiqe.com!',
      'Offline craftsmanship that never sends you push notifications! Tap below for "{TITLE}"!',
      'Analog joy in a chaotic digital world! Pick up Bonnie’s handmade "{TITLE}" today!',
    ],
  },
  {
    topic: 'Modern Dating Apps & Slang',
    hooks: [
      'Tammy, you were telling me about "swiping left" on young men, and that sounds like grocery shopping with thumbs.',
      'Tammy, I heard a customer say her date "ghosted" her. Back in my day, ghosts only haunted abandoned barns!',
      'Explain this to me: people meet on a glowing glass rectangle instead of at the strawberry shortcake social?!',
      'Tammy, why are people rating each other’s "aura" on the internet instead of checking if they can change a tire?!',
      'I saw a young couple at the diner yesterday: both staring at their telephones instead of sharing a malted shake!',
    ],
    grandmaLogics: [
      'In 1968, if Harold liked me, he brought two bushels of peaches to my porch and stood there looking bashful!',
      'If a man can’t look you in the eyes and compliment your apple pie in person, he doesn’t deserve your phone number!',
      'If someone "ghosted" me in my twenties, I’d have called his mother and asked if he had fallen down an old well!',
      'Swiping left?! What if Harold had been on the left page and I swiped him into the municipal landfill?!',
      'Aura?! A good aura is a freshly mowed lawn, a warm teapot, and clean porch screens, not internet karma points!',
    ],
    tammyReactions: [
      'Mom, Harold bringing two bushels of peaches to your porch is legally classified as agricultural dumping.',
      'Mom, calling a modern 28-year-old’s mother because he stopped texting back is psychological warfare!',
      'Mom, modern dating is terrifying, if Harold had an Instagram account he would have ghosted the peaches!',
      'You cannot compare the strawberry shortcake social to an algorithmic matchmaking platform!',
      'Actually, if someone brought me two bushels of fresh peaches today, I might delete all my apps on the spot.',
    ],
    interruptions: [
      '—Wait, did Harold really bring 80 pounds of stone fruit to your doorstep?!—',
      '—Mom, please tell me you didn’t actually call someone’s mother!—',
      '—Hold up, agricultural dumping has me wheezing!—',
      '—Stop right there, Harold would have been an influencer with those peaches!—',
    ],
    punchlines: [
      'Looking for a 100% green flag? Bonnie’s handmade "{TITLE}" never ghosts and always brings the sparkle!',
      'Find genuine connection with genuine handmade art! Tap the link for our handcrafted "{TITLE}"!',
      'Better than any dating app match! Snag your sparkling "{TITLE}" at btboutiqe.com!',
      'No swiping required, only pure joy! Check out our handmade "{TITLE}" in the boutique!',
    ],
  },
  {
    topic: 'Robot Vacuums & Automation',
    hooks: [
      'Tammy, that little robotic vacuum disc under the sofa turned its little lights on at 2 AM and spooked the cat.',
      'Tammy, that motorized hockey puck you bought to clean the rugs is planning something, I can hear it clicking.',
      'Why did that automatic vacuum cleaner get itself wedged under the coat rack and start beeping like a microwave?!',
      'Tammy, an electric frisbee is roaming around the parlor bumping into my antique rocking chair!',
      'I was sitting peacefully knitting, and that mechanical pancake tried to swallow the fringe on my house slippers!',
    ],
    grandmaLogics: [
      'A real broom gives your arms exercise and lets you inspect the baseboards for spider webs with your own eyeballs!',
      'That machine doesn’t know the difference between a dropped pearl bead and a breadcrumb! It has no discretion!',
      'The cat sat on top of it this morning and rode it into the powder room like a furry little monarch!',
      'Back in my day, we swept with broomcorn and shook the rugs over the clothesline until the dust saw the light of day!',
      'I caught it spinning in circles against the pantry door like it was lost in a corn maze!',
    ],
    tammyReactions: [
      'Mom, that "motorized hockey puck" has LiDAR spatial mapping and cleans 1,200 square feet without complaining!',
      'Mom, the cat riding the robot vacuum is the highest-viewed video on my entire TikTok account!',
      'It has discretion, Mom, you just have to pick up your loose crochet skeins before the scheduled run!',
      'Mom, shaking rugs over the clothesline in freezing October weather gives you pneumonia, not moral superiority!',
      'Okay, but when it gets stuck on a sock and sends a notification saying "I’m trapped on a cliff", it is pretty funny.',
    ],
    interruptions: [
      '—Wait, the cat rode it into the powder room again?!—',
      '—Mom, did you just call LiDAR navigation a mechanical pancake?!—',
      '—Hold on, did you rescue the slipper fringe in time?!—',
      '—Stop, the robot vacuum has a name and it is Sir Dust-a-Lot!—',
    ],
    punchlines: [
      'Tough enough to survive any runaway robot vacuum! Snag our handcrafted "{TITLE}" at btboutiqe.com!',
      'Handmade quality with zero robotic rebellion! Grab your sparkling "{TITLE}" right here!',
      'Add pure sparkle to your day! Tap below for Bonnie’s lovingly crafted "{TITLE}"!',
      'No mechanical pancakes here, just genuine craft! Check out our handmade "{TITLE}" today!',
    ],
  },
  {
    topic: 'Cryptocurrency & Digital Coins',
    hooks: [
      'Tammy, your nephew told me he bought three digital invisible coins on the internet and called it an investment portfolio.',
      'Tammy, explain to me why someone would trade actual green paper dollars for computer tokens stored in the cloud.',
      'I read that people are buying imaginary pixel land next to imaginary celebrities for fifty thousand dollars!',
      'Tammy, what is a blockchain and why is my bank teller warning people about dog-themed internet tokens?!',
      'Someone asked if Bonnie’s Boutique accepts crypto-wallets, and I showed them my real leather change purse!',
    ],
    grandmaLogics: [
      'If I cannot drop a coin into my metal piggy bank and hear a solid clink, it does not exist in the eyes of the Lord!',
      'Harold kept fifty-dollar savings bonds tucked behind the portrait of George Washington and they never got wiped by a server outage!',
      'The moment the electricity cuts off, where does your digital Bitcoin go? It evaporates into thin ozone!',
      'I don’t want a decentralized ledger! I want a receipt with blue ink and a smiley face from the grocery store cashier!',
      'A coin should have Abraham Lincoln’s nose stamped in copper, not a cartoon Shiba Inu smiling at you on a screen!',
    ],
    tammyReactions: [
      'Mom, crypto operates on cryptographic distributed ledgers, though honestly Kevin lost his college textbook money on Dogecoin.',
      'Mom, the George Washington portrait savings bonds yielded 1.2% interest over forty years, which is basically negative profit!',
      'Mom, the blockchain does not evaporate in a blackout, but yes, buying virtual sandboxes was pretty absurd.',
      'Mom, Kevin calling his crypto trading an investment portfolio when his net worth is $42 is tragic comedy.',
      'Okay, but your leather change purse with the brass snap clasp honestly has higher liquidity than half the crypto market.',
    ],
    interruptions: [
      '—Wait, Kevin bought Dogecoin with his textbook money?!—',
      '—Mom, did you really tell a customer to put their Bitcoin in a piggy bank?!—',
      '—Hold on, the George Washington portrait bond stash is legendary!—',
      '—Stop, the cartoon Shiba Inu comparison took me out!—',
    ],
    punchlines: [
      'Invest in physical, sparkling beauty that never gets wiped out! Tap the link for "{TITLE}"!',
      'Real craftsmanship you can hold in your hands! Grab Bonnie’s handmade "{TITLE}" at btboutiqe.com!',
      'Zero blockchain volatility, 100% handmade delight! Snag your "{TITLE}" right here!',
      'The only gold standard you need! Pick up our dazzling "{TITLE}" in the shop today!',
    ],
  },
  {
    topic: 'Air Fryers & Kitchen Gadgets',
    hooks: [
      'Tammy, the neighbor brought over an electric bucket and claimed it fries chicken with nothing but whirlwind air.',
      'Tammy, why is everyone on the block treating this plastic convection bucket like a religious awakening?!',
      'I was told an air fryer can make crispy French fries in eight minutes with zero lard, and I am skeptical.',
      'Tammy, people are cooking entire Thanksgiving turkeys inside desktop convection turbines and calling it gourmet!',
      'Someone told me to throw away my 70-year seasoned cast-iron skillet and replace it with a non-stick toaster pod!',
    ],
    grandmaLogics: [
      'An air fryer is just a hair dryer trapped inside a plastic mailbox! It has no soul and no grease seasoning!',
      'My cast iron skillet was seasoned by my grandmother in 1948 and has survived three house moves and a kitchen fire!',
      'If you don’t smell bubbling butter and hear the crackle in the pan, you are not cooking, you are warming up plastic!',
      'They tell you it’s easy to clean, but you have to take apart three greasy baskets with a tiny toothbrush!',
      'Good fried chicken requires patience, cast iron, and love—not a miniature jet engine humming on the laminate counter!',
    ],
    tammyReactions: [
      'Mom, a hair dryer in a plastic mailbox?! Air fryers use 400-degree high-velocity thermal convection currents!',
      'Mom, the air fryer reheats pizza slices to god-tier crispiness in three minutes flat, do not disrespect the bucket!',
      'Nobody is throwing away your heirloom skillet, Mom, but washing cast iron without soap is like a biochemical hazard!',
      'Mom, people love air fryers because working 10-hour days leaves zero energy for a three-hour lard braising session!',
      'Okay, but having to scrub the tiny metal basket grate with a toothbrush is genuinely my least favorite chore.',
    ],
    interruptions: [
      '—Wait, did you just call high-velocity convection a hair dryer in a mailbox?!—',
      '—Mom, please do not lecture the neighbor about 1948 cast iron seasoning!—',
      '—Hold on, the pizza reheat capability is unmatched though!—',
      '—Stop, you cannot compare an air fryer to a jet engine!—',
    ],
    punchlines: [
      'Handmade with patience, love, and zero plastic parts! Grab our handcrafted "{TITLE}" at btboutiqe.com!',
      'Heirloom quality that lasts generations! Tap below for Bonnie’s exquisite "{TITLE}"!',
      'Skip the kitchen gadgets and treat yourself to real sparkle! Check out "{TITLE}" today!',
      'Crafted with genuine warmth that never goes out of style! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    topic: 'Influencer Ice Plunges & 4 AM Routines',
    hooks: [
      'Tammy, I watched a young man on your telephone climb into a trough of ice cubes at 4 AM to "optimize his dopamine".',
      'Tammy, explain why healthy young adults are paying five dollars a bag for party ice to freeze themselves in the garage.',
      'I saw an internet video: someone woke up at 3:30 AM, drank saltwater with lemons, and journaled about gratitude in the dark.',
      'Tammy, why is suffering in freezing water considered wellness now instead of just a broken water heater?!',
      'A customer told me she does ten minutes of breathwork and cold exposure before breakfast to build mental resilience!',
    ],
    grandmaLogics: [
      'If Harold had gotten up at 4 AM to sit in an ice trough, his father would have checked him for a fever with a barn thermometer!',
      'In Maine in 1961, when the oil furnace went out, we called that hypothermia, not a luxury wellness retreat!',
      'Dopamine?! You want dopamine? Eat a warm cinnamon roll fresh out of the oven and pet the family dog!',
      'People are inventing problems so they can conquer them! Go shovel the driveway if you want cold exposure and discipline!',
      'A proper morning routine is hot coffee, buttered toast, and feeding the chickadees on the porch railing!',
    ],
    tammyReactions: [
      'Mom, cold plunge therapy stimulates norepinephrine release and reduces systemic inflammation by 200%!',
      'Mom, shoveling the driveway does not come with a bluetooth water temperature monitor and soothing lo-fi beats!',
      'Eating warm cinnamon rolls and petting the dog does sound significantly better than sitting in frozen slush, though.',
      'Mom, Harold’s father using a barn thermometer is an OSHA violation in thirty-seven states!',
      'Okay, but watching influencers shiver uncontrollably while trying to look serene on camera is pure comedy gold.',
    ],
    interruptions: [
      '—Wait, did you really say go shovel the driveway for dopamine?!—',
      '—Mom, systemic inflammation reduction is a real scientific study!—',
      '—Hold on, the barn thermometer story has me crying!—',
      '—Stop right there, cinnamon roll dopamine is scientifically undefeated!—',
    ],
    punchlines: [
      'Warm up your day without sitting in an ice trough! Grab our cozy "{TITLE}" at btboutiqe.com!',
      '100% pure dopamine with zero freezing water! Tap below for Bonnie’s handmade "{TITLE}"!',
      'The sweetest mental wellness boost in town! Snag your handcrafted "{TITLE}" today!',
      'Skip the 4 AM suffering and embrace handmade joy! Check out our "{TITLE}" in the shop!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 3: COZY BOUTIQUE LORE (Behind the Counter Chronicles)
// ─────────────────────────────────────────────────────────────────────────────
export interface LoreScenario {
  legend: string;
  hooks: string[];
  grandmaTales: string[];
  tammyRebuttals: string[];
  interruptions: string[];
  punchlines: string[];
}

export const LORE_SCENARIOS: LoreScenario[] = [
  {
    legend: 'The Midnight Bead Avalanche',
    hooks: [
      'Tammy, every October when the shop floorboards creak, I remember the Great Midnight Bead Avalanche of 2024.',
      'Tammy, remember when the top storage shelf gave way during that thunderstorm and rained glass seed beads?!',
      'I was dusting the display case this morning, and I found a single metallic teal bead from the Incident.',
      'Tammy, do you hear that faint rolling sound beneath the counter? The legends say the beads are migrating.',
      'That customer asked how many beads we have in the shop, and my heart skipped three beats remembering the jar collapse.',
    ],
    grandmaTales: [
      'Twelve glass apothecary jars fell off the maple trim! Forty thousand iridescent glass beads rolling like marbles!',
      'We were finding faceted crystal rondelles inside the cash register drawer until well after Thanksgiving!',
      'The parlor floor looked like a glittering river of jewels! I had to walk across the room in snowshoes!',
      'Your father came downstairs with a flashlight and thought fairies had broken in to tile the kitchen floor!',
      'I didn’t sleep for three nights! I was sorting sea-green from emerald by candlelight with a plastic spoon!',
    ],
    tammyRebuttals: [
      'Mom, you did not wear snowshoes, you were wearing fluffy bunny slippers and sliding like an Olympic curler!',
      'Dad did not think it was fairies, Dad thought the ceiling had collapsed because of your bead hoarding!',
      'Mom, I found a purple spacer bead inside my winter boots two weeks ago! The Incident is still happening!',
      'Sorting 40,000 beads with a plastic spoon by candlelight is the villain origin story of this entire boutique!',
      'I had bead-sorting trauma for six months, but honestly the shop looked magical reflecting the streetlights.',
    ],
    interruptions: [
      '—Wait, you still haven’t found the gold star beads from that batch?!—',
      '—Mom, please don’t tell me you kept that plastic spoon as a relic!—',
      '—Hold on, did you actually slide across the parlor in slippers?!—',
      '—Stop, the snowshoes detail is absolute boutique folklore!—',
    ],
    punchlines: [
      'Forged from the lessons of the Great Bead Avalanche! Grab our perfectly secured "{TITLE}"!',
      'Zero loose beads here, only indestructible craftsmanship! Tap the link for "{TITLE}" at btboutiqe.com!',
      'A piece of boutique history in your hands! Check out Bonnie’s handmade "{TITLE}" today!',
      'Sparkling, secure, and made with love! Pick up your very own "{TITLE}" before the next avalanche!',
    ],
  },
  {
    legend: 'The Ribbon Ghost of the Yarn Basket',
    hooks: [
      'Tammy, did you move my Japanese embroidery scissors from the top counter tray again?!',
      'Tammy, mark my words: there is a friendly ribbon ghost living in the bottom of the velvet yarn basket.',
      'Look at this spool of wired sage satin! It was wound counter-clockwise yesterday, and today it is clockwise!',
      'Tammy, whenever the shop chimes ring at 3:15 PM and nobody walks through the door, the ghost is browsing.',
      'I swear on my grandmother’s thimble, someone organized the vintage buttons by number of holes overnight.',
    ],
    grandmaTales: [
      'She is a cozy ghost! Probably a Victorian seamstress who appreciates a nice quarter-inch hem!',
      'Every time I drop a spool of thread, it rolls toward the tea kettle instead of under the couch. That is spectral assistance!',
      'She only takes wooden spools and shiny brass safety pins! A very tasteful apparition, bless her soul.',
      'If you leave out a saucer of Earl Grey tea with two sugar cubes, your ribbons never tangle the next morning!',
      'I asked her politely for my scissors back, and ten minutes later they were sitting next to the cinnamon scones.',
    ],
    tammyRebuttals: [
      'Mom, I moved the scissors because you left them directly next to the open hot glue gun!',
      'Mom, the wind from the front mail slot blows the door chimes at 3:15 PM every single afternoon!',
      'The buttons were organized by number of holes because I spent Tuesday night doing inventory while eating chips!',
      'Mom, ghosts do not drink Earl Grey tea, the steam just evaporated in the dry autumn radiator heat!',
      'I put your scissors next to the scones because that is where I found you eating lunch yesterday!',
    ],
    interruptions: [
      '—Wait, so the ghost is actually just me doing overtime?!—',
      '—Mom, are you really bribing Victorian spirits with cinnamon scones?!—',
      '—Hold on, did you say two sugar cubes?!—',
      '—Stop, the ribbon spool was clockwise because I wound it, Mom!—',
    ],
    punchlines: [
      'Infused with cozy boutique magic and zero ghost pranks! Snag our handcrafted "{TITLE}" at btboutiqe.com!',
      'Handmade perfection that even Victorian seamstresses would admire! Tap below for "{TITLE}"!',
      'No spectral intervention required! Grab Bonnie’s exquisite "{TITLE}" in the shop today!',
      'Blessed with warmth, charm, and boutique lore! Check out our handmade "{TITLE}" now!',
    ],
  },
  {
    legend: 'The Great Cinnamon Scone Trade of 2019',
    hooks: [
      'Tammy, looking at this glass bead display reminds me of the historic Cinnamon Scone Trade of 2019.',
      'Tammy, remember when Mrs. Henderson brought three trays of hot cinnamon scones to the back counter?!',
      'Every time the autumn spices fill the kitchen, I think about the wholesale barter that founded our vintage cane stash.',
      'Tammy, did you know half the Venetian glass rondelles in this showcase were acquired through baked goods?!',
      'A customer asked where we got these rare amber crystals, and the truth involves pastry glaze and high-stakes negotiation.',
    ],
    grandmaTales: [
      'Mrs. Henderson’s bakery had extra vanilla-glazed scones, and she saw my antique Murano bead tray! A trade was struck!',
      'We traded four warm cinnamon pastries for sixty vintage hand-blown Czech glass spacers! The greatest deal in Maine history!',
      'The whole boutique smelled of cinnamon sugar and cedar shavings for a solid week! Customers thought we opened a patisserie!',
      'Your father tried to intercept the pastry tin on the way to the counter, but I guarded it with a wooden yardstick!',
      'To this day, every time I thread an amber bead, I swear I can smell a hint of brown sugar and nutmeg.',
    ],
    tammyRebuttals: [
      'Mom, bartering boutique jewelry components for baked goods is technically an off-the-books commercial transaction!',
      'Dad was not trying to intercept the trade, Mom, he was starving because you spent five hours sorting bead facets!',
      'Mrs. Henderson still tells everyone at church that she fleeced you because those scones cost her $3 to bake!',
      'Guarding pastry with a wooden yardstick is peak Bonnie boutique security protocol!',
      'Honestly though, those Czech glass spacers were worth way more than pastries, so you definitely won that negotiation.',
    ],
    interruptions: [
      '—Wait, you guarded the cinnamon scones with a yardstick?!—',
      '—Mom, please don’t tell me you traded inventory for pastry again!—',
      '—Hold on, sixty Murano spacers for four scones?!—',
      '—Stop, the smell of cinnamon and cedar shavings sounds amazing!—',
    ],
    punchlines: [
      'Sweet craftsmanship with a legendary boutique story! Grab your handmade "{TITLE}" at btboutiqe.com!',
      'Treasured history and unmatched sparkle! Tap the link for Bonnie’s "{TITLE}"!',
      'Infused with warmth, charm, and sweet shop memories! Check out our "{TITLE}" today!',
      'A handcrafted treasure worthy of the finest barter! Snag your "{TITLE}" in the shop!',
    ],
  },
  {
    legend: 'The Runaway Spool & The Ceiling Chandelier',
    hooks: [
      'Tammy, look up at the shop chandelier! Do you see that tiny glint of silver thread on the brass arm?!',
      'Tammy, remember the great nylon thread runaway during the Christmas rush of 2022?!',
      'I was winding a 500-yard industrial spool of bonded beading cord, and the spindle popped right out of the bracket.',
      'Tammy, that chandelier has seen things no parlor lighting fixture was ever designed to witness.',
      'Every time someone tugs on a spool of thread in this shop, I check the ceiling just in case.',
    ],
    grandmaTales: [
      'That spool rolled off the counter, bounced off the footstool, and rocketed across the room like an unguided missile!',
      'The nylon line caught on the brass chandelier scroll and spun like a carnival ride, wrapping the arms in silver cobwebs!',
      'We looked like we were hosting a disco party for spiders! There was 300 yards of monofilament hanging in festive loops!',
      'Your father came in with the step stool and a broom handle trying to fish it down while singing Rudolph!',
      'I refused to cut the cord because it was premium bonded nylon! We unspooled it backwards by hand for two hours!',
    ],
    tammyRebuttals: [
      'Mom, you did not unspool it backwards, we had to duck under silver tripwires like we were infiltrating a museum vault!',
      'Dad was singing Rudolph because he was trying not to scream while untangling 300 yards of monofilament!',
      'Customers were walking in and complimenting the modern art installation on the ceiling!',
      'Mom, spending two hours rewinding nylon thread to save four dollars is the purest distillation of your personality.',
      'The chandelier actually looked spectacular when the sunlight hit the monofilament prisms, not going to lie.',
    ],
    interruptions: [
      '—Wait, customers thought it was an art installation?!—',
      '—Mom, tripwires in the parlor is wild!—',
      '—Hold on, 500 yards of industrial spool on the loose?!—',
      '—Stop, Dad singing Rudolph on the step stool is forever iconic!—',
    ],
    punchlines: [
      'Tightly secured with unbreakable tension! Grab our handcrafted "{TITLE}" at btboutiqe.com!',
      'Zero runaway threads, only pristine boutique beauty! Tap below for your "{TITLE}"!',
      'Handmade with love and chandelier-tested strength! Check out "{TITLE}" today!',
      'Sparkling resilience for everyday life! Pick up Bonnie’s handmade "{TITLE}" now!',
    ],
  },
  {
    legend: 'The Secret Compartment Behind the Wallpaper',
    hooks: [
      'Tammy, when we remodeled the back counter in 2020, do you remember what we found behind the vintage rose wallpaper?!',
      'Tammy, the history in these shop walls runs deeper than anyone realizes.',
      'I was peeling back a damp corner of floral wallpaper by the window, and a hollow wooden panel slid open.',
      'Tammy, do you remember the brass thimble and the handwritten letter from 1924 tucked in the wall cavity?!',
      'Every old building has secrets, but Bonnie’s Boutique has an actual treasure stash behind the woodwork.',
    ],
    grandmaTales: [
      'Inside that hollow panel was a bundle of velvet ribbon, three brass thimbles, and a 1924 newspaper clipping about a local fair!',
      'A seamstress named Clara had stashed her finest mother-of-pearl buttons in a glass vial to keep them safe from the dust!',
      'I felt an immediate kinship across a hundred years! She was hiding her good buttons from family members just like me!',
      'We framed the newspaper clipping and hung it next to the register—it said first prize in embroidery went to Clara Miller!',
      'I promised Clara’s spirit that as long as this shop stands, handmade craft and honest beauty will live here.',
    ],
    tammyRebuttals: [
      'Mom, she was not hiding buttons from family members, the house was built in 1912 and people stored valuables in lathe-and-plaster cavities!',
      'Finding a 100-year-old brass thimble that perfectly fit your thumb was pretty eerie though, I will admit that.',
      'Clara Miller would be proud that her embroidery legacy evolved into high-sparkle beaded pens and TikTok livestreams!',
      'Mom, framing the fair clipping was the best decor decision you ever made, customers ask about it every day.',
      'Just please do not start tapping on all the other walls with a hammer looking for Clara’s secret emeralds.',
    ],
    interruptions: [
      '—Wait, the brass thimble fit your thumb on the first try?!—',
      '—Mom, hiding buttons from family across a century is hilarious!—',
      '—Hold on, Clara Miller’s spirit is definitely guarding this shop!—',
      '—Stop right there, mother-of-pearl buttons from 1924 are priceless!—',
    ],
    punchlines: [
      'A century of handmade devotion in every bead! Grab our handcrafted "{TITLE}" at btboutiqe.com!',
      'Heirloom charm passed down through generations! Tap below for your "{TITLE}"!',
      'Timeless boutique magic you can carry anywhere! Check out Bonnie’s "{TITLE}" today!',
      'Crafted with the soul of old-world artisanship! Snag your handmade "{TITLE}" now!',
    ],
  },
  {
    legend: 'The Ice Storm of 98 Candlelit Crafting Marathon',
    hooks: [
      'Tammy, look at the snow globe on the mantle. It always brings me back to the Ice Storm of 1998.',
      'Tammy, remember the great January blizzard when the power was out for five straight days across the county?!',
      'When the power lines snapped and the radiators went silent, we didn’t panic—we lit twenty beeswax candles.',
      'Tammy, you were just a little girl wrapped in four wool quilts while I beaded by the wood stove.',
      'That ice storm froze the front bay window solid, but inside the shop, it was warm as summer.',
    ],
    grandmaTales: [
      'The birch trees were coated in two inches of crystal ice! The whole world outside looked like blown glass!',
      'We had the cast-iron kettle whistling on the wood stove, making constant pots of cinnamon apple cider.',
      'I strung fifty beaded winter bookmarks by candlelight while your father read old mystery novels out loud!',
      'The beeswax candles made the shop smell like honey and cedar smoke. It was the coziest week of our lives.',
      'When the electric lights finally flickered back on, we actually felt a little sad to see the candles go out.',
    ],
    tammyRebuttals: [
      'Mom, I was five years old and you made me wear three pairs of wool socks and mittens while sorting seed beads!',
      'Dad was not reading mystery novels out loud for ambiance, he was trying to keep us from freezing to death!',
      'Mom, romanticizing a catastrophic municipal grid failure that paralyzed New England is peak Grandma logic!',
      'I still remember the reflection of the candle flames in the glass beads, though. It really was like living inside a fairy tale.',
      'And those fifty bookmarks sold out in two hours the moment the boutique doors reopened after the storm!',
    ],
    interruptions: [
      '—Wait, you made me sort beads with mittens on?!—',
      '—Mom, five days without power is an emergency, not a retreat!—',
      '—Hold on, the beeswax and cider smell memory is unlocked!—',
      '—Stop, fifty bookmarks by candlelight is an Olympic endurance feat!—',
    ],
    punchlines: [
      'Cozy warmth that outshines any winter storm! Grab your handcrafted "{TITLE}" at btboutiqe.com!',
      'Handmade brilliance that never loses its glow! Tap the link for Bonnie’s "{TITLE}"!',
      'Warm your heart with authentic boutique craft! Check out our sparkling "{TITLE}" today!',
      'Born from resilience, love, and candlelight! Pick up your very own "{TITLE}" in the shop!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 4: VINTAGE RELIC DEBATES (Cursed, Blessed, or Overpriced? / Relic Radar)
// ─────────────────────────────────────────────────────────────────────────────
export interface RelicScenario {
  tier: string;
  topic?: string;
  relicClass?: string;
  hooks: string[];
  grandmaBlessings: string[];
  tammyAppraisals: string[];
  interruptions: string[];
  punchlines: string[];
}

export const RELIC_SCENARIOS: RelicScenario[] = [
  {
    topic: "Grandma's Secret Stash",
    tier: "Grandma's Secret Stash",
    relicClass: "Grandma's Secret Stash",
    hooks: [
      'Tammy! Bring up the official RPG Appraisal HUD! We have an ultra-rare artifact on the showcase counter!',
      'Item identified! Mom, what legendary enchantments did you weave into this handmade creation?!',
      'Counter check: Tammy, inspect the mana resonance on this freshly completed boutique trinket!',
      'Tammy, look at how the lantern light catches these beads! This is not just a pen, it is an epic quest item!',
      'The Appraisal Scanner is pinging! We have got a Mythic-tier item resting right on the velvet mat!',
    ],
    grandmaBlessings: [
      'I strung this with quadruple-strength nylon cord while listening to Glenn Miller! It grants +100 Peace of Mind!',
      'This charm has a special grandma blessing: whoever holds it will never drop their grocery coupons in a puddle!',
      'I hand-polished each glass crystal with lavender oil! It cures bad handwriting and dispels Monday morning blues!',
      'This trinket is blessed with eternal patience: guaranteed to keep you calm during three-hour school board meetings!',
      'Look at that charm topper! That is solid brass antique plating. It repels negative energy and cold drafts!',
    ],
    tammyAppraisals: [
      'Official RPG Appraisal: +85 Charisma, +95 Cozy Shielding, and a passive perk that prevents writer’s block!',
      'Stats confirmed: Rarity tier is Grandma’s Secret Stash! Price is an unreal steal at only eight dollars!',
      'Look at the HUD card! Item Level 99 Beaded Wand! Dungeon bosses would surrender their loot just to look at it!',
      'Durability rating: 100/100! You could take this through a dragon raid and the bead tension would not budge!',
      'Passive ability: Whenever you sign a document with this, your handwriting automatically looks 30% fancier!',
    ],
    interruptions: [
      '—Wait, did you say it repels school board meetings?!—',
      '—Mom, the RPG Scanner is flashing gold right now!—',
      '—Hold on, did you really polish every crystal with lavender oil?!—',
      '—Stop right there, +95 Cozy Shielding is an all-time record!—',
    ],
    punchlines: [
      'Equip your inventory with this legendary loot! Tap the link for our handmade "{TITLE}" at btboutiqe.com!',
      'Level up your everyday carry! Grab the Mythic-tier "{TITLE}" before it disappears into someone’s stash!',
      'Add +100 Cozy Charm to your day! Snag your handmade "{TITLE}" right here in the boutique!',
      'The ultimate quest reward for everyday life! Check out Bonnie’s handcrafted "{TITLE}" today!',
    ],
  },
  {
    topic: 'Epic Artifact',
    tier: 'Epic Artifact',
    relicClass: 'Epic Relic',
    hooks: [
      'Alert the adventuring party! Tammy, we have an Epic Relic sitting next to the cash register!',
      'Tammy, check the counter scanner! This handmade piece is radiating pure mystical enchantment!',
      'New item appraisal request! Mom, did you craft this with glass seed beads or crystallized star fragments?!',
      'Tammy, look at the color gradient on this piece! It looks like an enchanted sunrise over the mountains!',
      'Appraisal time! Let’s find out if this boutique treasure belongs in a museum or someone’s backpack!',
    ],
    grandmaBlessings: [
      'Those are Czech fire-polished glass beads, Tammy! They sparkle brighter than the Sunday church chandelier!',
      'I knotted this with my triple-twist tension method! My grandmother taught me this in 1952—it never unravels!',
      'Every bead was hand-selected under the magnifying lamp! No crooked holes, no dull facets, only perfection!',
      'This charm has a secret charm: it makes your keys jingle with a soothing chime that calms anxious nerves!',
      'I prayed over this batch that whoever receives it receives good news in their mailbox within seven days!',
    ],
    tammyAppraisals: [
      'Stats locked in: +70 Focus, +80 Wholesome Radiance, and immune to the "Lost in the Bottom of the Purse" curse!',
      'Rarity confirmed: Epic Tier! Aesthetic rating is off the charts—pure cottagecore fantasy aesthetics!',
      'HUD breakdown: +65 Kinetic Charm! The weighted bead balance feels like holding an aerospace stylus!',
      'Passive bonus: +50 Luck when picking out scratch-off tickets or finding good parking spots at the mall!',
      'Official verdict: Cursed? Absolutely not! Blessed? Beyond measure! Priced at just $8? An absolute crime of value!',
    ],
    interruptions: [
      '—Wait, immune to being lost in the bottom of the purse?! That is priceless!—',
      '—Mom, look at that macro sparkle on the camera zoom!—',
      '—Hold on, good news in the mailbox within seven days?!—',
      '—Stop, the Czech fire-polished facets are blinding the lens!—',
    ],
    punchlines: [
      'Claim your Epic Relic! Tap below for Bonnie’s lovingly crafted "{TITLE}" at btboutiqe.com!',
      'Never lose your keys in the dark again! Snag this handcrafted "{TITLE}" today!',
      'Pure handcrafted magic for your pocket or desk! Grab your "{TITLE}" before it sells out!',
      'A true treasure for your everyday adventures! Check out our handmade "{TITLE}" in the store!',
    ],
  },
  {
    topic: 'The Goblin Merchant Special',
    tier: 'The Goblin Merchant Special',
    relicClass: 'Goblin Treasure',
    hooks: [
      'Tammy! The RPG scanner is detecting an eccentric artifact from the wandering merchant caravan!',
      'Appraisal alert: We have a chaotic neutral treasure resting on the checkout counter!',
      'Mom, what strange bargain did you strike with the traveling bead peddler to acquire these materials?!',
      'Tammy, look at the chromatic shift on these beads—it looks like something a mischievous forest goblin traded for pie!',
      'Counter check: Is this piece blessed with cozy serendipity or imbued with mild harmless chaos?!',
    ],
    grandmaBlessings: [
      'I bought these beads from an odd gentleman at the flea market who insisted they were salvaged from an antique music box!',
      'This charm has a special protection spell: it prevents toast from burning when you get distracted by phone calls!',
      'I blessed it with +90 Chaos Resistance! It keeps your car keys from vanishing between the sofa cushions!',
      'Every crystal facet reflects a different rainbow when the sun hits the counter! It brings good fortune to daydreamers!',
      'I strung this while laughing at funny cat videos—it radiates +80 Wholesome Mischief!',
    ],
    tammyAppraisals: [
      'Item Classification: Goblin Merchant Special! Rarity: Rare with +85 Charisma and +40 Barter Advantage!',
      'Passive Perk: "Toast Guardian" confirmed! Never suffer a charred sourdough bagel again!',
      'Aesthetic audit: 10/10 cottagecore goblin aesthetic! Perfectly chaotic bead sizing that feels incredible in the hand!',
      'Lore check: The flea market merchant was definitely an NPC side quest disguised as a retired plumber!',
      'Price analysis: An artifact of this potency should cost 500 gold coins, but Mom priced it at $8 flat!',
    ],
    interruptions: [
      '—Wait, prevents toast from burning?! That is S-tier utility!—',
      '—Mom, the flea market peddler was an actual fantasy NPC!—',
      '—Hold on, +90 Chaos Resistance is off the charts!—',
      '—Stop right there, 500 gold coin value for eight dollars?!—',
    ],
    punchlines: [
      'Equip this chaotic treasure today! Tap the link for Bonnie’s handcrafted "{TITLE}" at btboutiqe.com!',
      'Never lose your keys or burn your toast again! Grab "{TITLE}" right here!',
      'Add +80 Wholesome Mischief to your daily inventory! Check out "{TITLE}" now!',
      'The ultimate bargain artifact from the boutique! Snag your handmade "{TITLE}" today!',
    ],
  },
  {
    topic: 'Ancestral Heirloom: The 1940s Jeweler Visor',
    tier: 'Ancestral Heirloom: The 1940s Jeweler Visor',
    relicClass: 'Ancestral Relic',
    hooks: [
      'Tammy! The item scanner just detected pure Ancestral Heirloom energy on the crafting table!',
      'Appraisal HUD incoming: Item crafted using the legendary 1940s dual-lens jeweler visor!',
      'Mom, the precision on this bead alignment looks like it was calibrated by a Swiss watchmaker!',
      'Tammy, inspect the micro-clearance! Every loop and crimp on this piece has ancestral precision!',
      'Attention adventuring party: An heirloom-grade relic has arrived on the showcase velvet!',
    ],
    grandmaBlessings: [
      'I wore my father’s original 1946 jeweler loupe while finishing this piece! Every bead sits true to a tenth of a millimeter!',
      'This piece carries an ancestral blessing: it grants +100 Focus during long study sessions and tax season!',
      'I hand-tensioned each knot three times—it will withstand four generations of daily use without stretching!',
      'The silver spacer rings reflect clean white light, dispelling eye strain and mental fatigue!',
      'I said a prayer of clarity over this batch for anyone working on big dreams or creative projects!',
    ],
    tammyAppraisals: [
      'Stats breakdown: +95 Precision, +80 Intellectual Stamina, and passive resistance to mental burnout!',
      'Item tier: Ancestral Masterwork! Craftsmanship rating exceeds industrial automated manufacturing by 300%!',
      'HUD verification: The jeweler visor bonus applies +50 Critical Hit chance when writing final exam essays!',
      'Weight distribution: 100% ergonomic equilibrium—feels like holding an ancient scholarly stylus!',
      'Appraisal conclusion: Priceless heritage quality, certified heirloom status, ready to ship today!',
    ],
    interruptions: [
      '—Wait, the 1946 jeweler loupe?! That belongs in the Smithsonian!—',
      '—Mom, +100 Focus during tax season is an emergency need!—',
      '—Hold on, tenth of a millimeter precision on handmade beads?!—',
      '—Stop, the HUD is literally glowing celestial gold right now!—',
    ],
    punchlines: [
      'Channel ancestral precision in your daily carry! Grab our masterwork "{TITLE}" at btboutiqe.com!',
      'Heirloom quality made to inspire your best work! Tap below for your "{TITLE}"!',
      'Level up your desk with certified ancestral charm! Check out Bonnie’s "{TITLE}" today!',
      'Craftsmanship that outlasts the test of time! Pick up your handcrafted "{TITLE}" now!',
    ],
  },
  {
    topic: 'Celestial Radiant Class: The Prismatic Bead Wand',
    tier: 'Celestial Radiant Class: The Prismatic Bead Wand',
    relicClass: 'Celestial Artifact',
    hooks: [
      'Sound the horns of Valhalla! Tammy, we have a Celestial Radiant relic on the shop display!',
      'Appraisal ping: Mana resonance exceeding maximum readable thresholds on the front counter!',
      'Mom, did you infuse this handmade creation with pure captured daylight or what?!',
      'Tammy, look at the prisms dancing across the counter wall—this is a true holy-class artifact!',
      'Scan complete: We have got a Mythic Prismatic Wand capable of banishing negative workplace vibes!',
    ],
    grandmaBlessings: [
      'Those are AB-coated crystal bicones! They catch the morning sun and throw tiny rainbows all over the parlor!',
      'This charm carries a grandma enchantment: it dispels the dread of unnecessary Zoom meetings!',
      'I polished every facet with clean linen—it grants +100 Radiant Cheerfulness to whoever holds it!',
      'It has a gentle weight that reminds you to breathe deep and take life one sweet moment at a time!',
      'I blessed this piece that whoever holds it feels wrapped in warm sunlight even on a rainy Tuesday!',
    ],
    tammyAppraisals: [
      'RPG Appraisal stats: +99 Radiance, +88 Mana Regeneration, and passive aura that blinds workplace detractors!',
      'Special Ability: "Zoom Meeting Immunity"—reduces psychological damage from corporate buzzwords by 80%!',
      'Visual aura check: The refractive index on these crystal bicones is blinding the studio camera sensor!',
      'Rarity level: Celestial Radiant Class! Only one forged in this exact bead configuration in the entire universe!',
      'Appraisal verdict: S-tier god loot that belongs in an enchanted sanctuary or your favorite tote bag!',
    ],
    interruptions: [
      '—Wait, Zoom Meeting Immunity?! Shut up and take my money!—',
      '—Mom, the prisms are literally making rainbow confetti on the wall!—',
      '—Hold on, +88 Mana Regen on an eight-dollar trinket?!—',
      '—Stop right there, corporate buzzword damage reduction is legendary!—',
    ],
    punchlines: [
      'Banish gloomy vibes with pure celestial sparkle! Tap the link for "{TITLE}" at btboutiqe.com!',
      'Equip your everyday adventures with radiant magic! Grab our handmade "{TITLE}" today!',
      'The ultimate mood booster for your pocket or desk! Check out Bonnie’s "{TITLE}" right now!',
      'One-of-a-kind celestial brilliance made with love! Pick up your "{TITLE}" in the boutique!',
    ],
  },
  {
    topic: 'Legendary Mythic Vault: The Unbreakable Knot Protocol',
    tier: 'Legendary Mythic Vault: The Unbreakable Knot Protocol',
    relicClass: 'Mythic Relic',
    hooks: [
      'Emergency RPG announcement! Tammy, an item from the Legendary Mythic Vault has been unlocked!',
      'Appraisal scan: Tensile integrity and structural durability exceeding all known realm parameters!',
      'Mom, did you knot this with titanium dragon sinew or commercial aerospace grade wire?!',
      'Tammy, look at the double-crimp finish—this piece is built to survive an apocalypse with zero bead loss!',
      'Counter alert: A fortress-grade artifact has arrived for public review!',
    ],
    grandmaBlessings: [
      'I knotted this using my signature quadruple-overhand locking hitch! A hurricane couldn’t snap this cord!',
      'This charm is blessed with absolute steadfastness: it keeps you grounded when life gets whirlwind chaotic!',
      'I tested the end loop with a five-pound iron weight from the kitchen scale—it didn’t stretch a fraction!',
      'The focal bead is solid furnace-fired ceramic! It repels clumsy drops and clumsy moods alike!',
      'I prayed over this piece that the person who carries it stands strong through every storm.',
    ],
    tammyAppraisals: [
      'Durability rating: Infinity out of 100! Item class: Unbreakable Fortress Relic!',
      'Passive Perk: "Steadfast Anchor"—grants +95 Emotional Armor and 100% immunity to butterfinger drops!',
      'The quadruple-overhand locking hitch has been certified by the Grand Guild of Craftsmen!',
      'HUD confirmation: You could literally take this through an endgame boss battle and the finish stays immaculate!',
      'Official appraisal: The strongest, most dependable handmade treasure ever produced in the state of Maine!',
    ],
    interruptions: [
      '—Wait, you tested it with a five-pound kitchen scale weight?!—',
      '—Mom, dragon sinew knotting is officially your new craft title!—',
      '—Hold on, immunity to butterfinger drops is a lifesaver!—',
      '—Stop, infinity durability on an eight-dollar item is peak boutique!—',
    ],
    punchlines: [
      'Built with unbreakable strength and boundless love! Grab your "{TITLE}" at btboutiqe.com!',
      'Equip the strongest charm in the realm! Tap below for Bonnie’s handcrafted "{TITLE}"!',
      'Fortress-grade durability meets delicate handmade sparkle! Check out "{TITLE}" today!',
      'An indestructible treasure for your everyday journey! Snag your "{TITLE}" in the shop!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 5: GEN-Z CULTURE CLASH (Aura Checks & Brainrot Translation)
// ─────────────────────────────────────────────────────────────────────────────
export interface CultureClashScenario {
  topic: string;
  hooks: string[];
  grandmaTakes: string[];
  tammyReactions: string[];
  interruptions: string[];
  punchlines: string[];
}

export const CULTURE_CLASH_SCENARIOS: CultureClashScenario[] = [
  {
    topic: 'Aura Checks & Main Character Energy',
    hooks: [
      'Tammy, that teenager who bought three pens told his friend that my boutique has "infinite aura". Is that a compliment?!',
      'Tammy, what does it mean when someone says I am emitting "main character energy" while slicing lemon loaf?!',
      'A young customer looked at my beaded pen display and said: "Mom, this collection is so valid, no cap".',
      'Tammy, someone left a comment on our video saying: "Grandma Bonnie has +10,000 aura and passes the vibe check".',
      'Tammy, why did a high school girl point her telephone at our bead wall and whisper: "This is peak cinema"?!',
    ],
    grandmaTakes: [
      'If having an aura means keeping the counter dusted and offering butterscotch candies, then I am proud of it!',
      'Main character?! Honey, I’ve been the main character of this township since the Bicentennial Parade of 1976!',
      'Valid?! Of course it’s valid! The bank accepted my wholesale bead check this morning with zero issues!',
      'No cap?! I told him I have three lovely knitted caps in the cloakroom if his ears are getting chilly!',
      'Peak cinema?! I told her if she wants cinema, we can put on Sound of Music and make buttered popcorn!',
    ],
    tammyReactions: [
      'Mom, "infinite aura" means you are cooler than the entire freshman class put together! You won the internet!',
      'Mom, claiming you have been the main character since 1976 is the hardest line ever spoken behind this counter!',
      'Mom, "valid" does not mean your bank check cleared, it means your taste in pastel glass beads is elite!',
      'Mom, "no cap" means no lie, you do not need to distribute winter headwear to the youth of America!',
      'She meant peak cinema as in the aesthetics of the shop look like a Wes Anderson film with better lighting!',
    ],
    interruptions: [
      '—Wait, did you really offer him butterscotch candies while he was aura checking you?!—',
      '—Mom, since 1976?! The confidence is staggering!—',
      '—Hold on, Wes Anderson wishes he had our bead inventory!—',
      '—Stop, you cannot knit caps for slang words, Mom!—',
    ],
    punchlines: [
      'Gain +10,000 aura instantly with Bonnie’s handmade "{TITLE}"! Tap the link below!',
      'No cap, pure handcrafted sparkle! Grab our certified elite "{TITLE}" at btboutiqe.com!',
      'Peak aesthetic energy for your everyday carry! Check out our handmade "{TITLE}" today!',
      'Main character vibes guaranteed! Pick up your very own "{TITLE}" in the boutique!',
    ],
  },
  {
    topic: 'Brainrot Slang & Being Cooked',
    hooks: [
      'Tammy, I heard a young man say he was "cooked" because he forgot his girlfriend’s anniversary.',
      'Tammy, what is a "skibidi" and why did the package delivery driver say it while scanning our boxes?!',
      'Tammy, a comment on our post said our prices are "so demure, so mindful". What happened to plain old "affordable"?!',
      'I overheard two teenagers outside the boutique arguing about who has "W Rizz". Is that a vitamin deficiency?!',
      'Tammy, someone called this charm pen "fanum tax exempt". Are we having an IRS audit?!',
    ],
    grandmaTakes: [
      'If that boy is cooked, he should sit down with a glass of sweet iced tea and apologize with peach cobbler!',
      'If the delivery driver says another nonsense word, I am putting an extra cinnamon roll in his lunch sack!',
      'Demure?! In my day, being demure meant you kept your knees together and didn’t gossip during sermon!',
      'W Rizz?! Sounds like a brand of shoe polish or motor oil! Young folks need more fresh outdoor air!',
      'Fanum tax?! There is no state sales tax on handcrafted stationery under local ordinance 14-B!',
    ],
    tammyReactions: [
      'Mom, "cooked" means he is doomed! Peach cobbler will not save a forgotten anniversary, trust me!',
      'Mom, do not look up skibidi, I am protecting your pristine 1950s brain cells from total digital decay!',
      'Mom, "so demure, so mindful" was viral satire! It means you are polite and tasteful, which you literally are!',
      'Mom, "W Rizz" means winning charisma, not motor oil! And no, it cannot be cured with multivitamins!',
      'Mom, Fanum tax is a joke about stealing french fries from your friends! The IRS is not auditing our beads!',
    ],
    interruptions: [
      '—Wait, did you actually quote local ordinance 14-B to a teenager?!—',
      '—Mom, please do not diagnose internet brainrot as a vitamin deficiency!—',
      '—Hold on, peach cobbler might actually fix the anniversary though!—',
      '—Stop, the delivery driver was just vibing with the packages!—',
    ],
    punchlines: [
      'Stay 100% unbothered and tax-exempt! Grab our handcrafted "{TITLE}" at btboutiqe.com!',
      'Max out your real-life charisma with Bonnie’s handmade "{TITLE}"! Tap below to order!',
      'So mindful, so sparkling, so handmade! Check out our lovely "{TITLE}" today!',
      'Pure wholesome charm that needs no translation! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    topic: 'Brat Summer & Neon Green Aesthetics',
    hooks: [
      'Tammy, why was there a crowd of college girls outside the shop wearing lime-green shirts and talking about a "brat summer"?!',
      'Tammy, what does it mean to be "brat" and why is lime green the official color of high fashion this season?!',
      'I heard a customer say our neon spacer beads are "giving very brat, very 365 party girl". Are we hosting raves now?!',
      'Tammy, why are young people celebrating being bratty?! Back in my day, being a brat earned you an early bedtime!',
      'Tammy, someone left a comment calling me "the mother of brat". Is that a compliment or do I need to call the sheriff?!',
    ],
    grandmaTakes: [
      'If they want neon green, I have three boxes of chartreuse embroidery floss from 1984 that glow like fireflies!',
      'Being a brat?! In 1958, if I acted bratty, my mother handed me a bucket of soapy water and told me to scrub the back stoop!',
      'Party girl 365?! Who has the energy to party 365 days a year? I need three days of recovery after church bingo!',
      'I looked at that lime green album cover—it looks like someone forgot to print the picture and just left the paper blank!',
      'If they want attitude, they should meet the church ladies when someone takes the last cinnamon coffee cake!',
    ],
    tammyReactions: [
      'Mom, "brat summer" was a cultural renaissance about embracing messy honesty, messy eyeliner, and loud pop music!',
      'Mom, calling you "the mother of brat" means they view you as an untouchable, rebellious matriarch of aesthetics!',
      'Mom, having chartreuse embroidery floss from 1984 is literally the most authentically brat thing imaginable!',
      'Church ladies fighting over cinnamon coffee cake is officially the most hardcore subculture in America.',
      'Okay, but you needing three days to recover from church bingo is painfully real.',
    ],
    interruptions: [
      '—Wait, chartreuse floss from 1984?! Mom, you invented the aesthetic!—',
      '—Mom, please don’t call the sheriff over pop culture slang!—',
      '—Hold on, church bingo recovery time has me dead!—',
      '—Stop right there, church ladies fighting over coffee cake is iconic!—',
    ],
    punchlines: [
      'Embrace your iconic energy with Bonnie’s handmade "{TITLE}"! Tap below to order!',
      'Authentic aesthetic perfection, no gatekeeping! Grab your "{TITLE}" at btboutiqe.com!',
      'Stay legendary and sparkling every day of the year! Check out our handcrafted "{TITLE}" now!',
      'From vintage vibes to modern flair! Pick up your very own "{TITLE}" in the boutique!',
    ],
  },
  {
    topic: 'Living Rent-Free & Roman Empire',
    hooks: [
      'Tammy, a young man told me that my butterscotch pie has been "living rent-free in his head" for six months.',
      'Tammy, how often does your father think about the Roman Empire? Because someone on the internet said it is a daily obsession.',
      'Tammy, explain why people are accusing ideas of squatting in their skulls without paying tenant lease fees.',
      'I asked Harold if he thinks about the Roman Empire, and he started explaining aqueduct plumbing while eating cereal!',
      'Tammy, why did a customer say our beaded charms are "rent-free real estate" on her backpack?!',
    ],
    grandmaTakes: [
      'If my butterscotch pie is living in his head, he can send a check for eight dollars to the boutique address!',
      'Harold thinking about the Roman Empire?! Harold spent two hours yesterday trying to find his reading glasses while wearing them on his forehead!',
      'Nobody lives rent-free in this economy! Even my houseplants have to produce clean oxygen to earn their windowsill space!',
      'The Roman Empire collapsed because they had lead pipes and too many emperors! If they had butterscotch pie, they would still be standing!',
      'If you want something to think about every day, think about whether you watered the petunias or turned off the curling iron!',
    ],
    tammyReactions: [
      'Mom, "living rent-free" is a metaphor for an unforgettable memory! You cannot invoice someone’s subconscious mind!',
      'Mom, Harold explaining Roman aqueducts over cornflakes confirms the internet theory with 100% scientific accuracy!',
      'Your houseplants paying rent in oxygen has me laughing so hard my stomach hurts!',
      'Mom, saying butterscotch pie could have prevented the fall of Rome is historical revisionism at its finest!',
      'Okay, but Harold wearing his glasses on his forehead while searching for them is a daily boutique event.',
    ],
    interruptions: [
      '—Wait, you want to invoice his subconscious mind for pie?!—',
      '—Mom, Harold really explained aqueducts over cereal?!—',
      '—Hold on, houseplant oxygen rent is unhinged!—',
      '—Stop, butterscotch pie saving Rome is the greatest sentence ever spoken!—',
    ],
    punchlines: [
      'Live rent-free in everyone’s admiration! Snag our handcrafted "{TITLE}" at btboutiqe.com!',
      'Unforgettable boutique sparkle you will cherish every day! Tap below for "{TITLE}"!',
      'Better than the Roman Empire and sweet as pie! Grab your handmade "{TITLE}" today!',
      'A true masterpiece for your everyday carry! Check out Bonnie’s "{TITLE}" right now!',
    ],
  },
  {
    topic: 'Gatekeeping & Spilling the Tea',
    hooks: [
      'Tammy, a customer accused me of "gatekeeping" because I wouldn’t tell her where I buy my Czech crystal beads.',
      'Tammy, what does it mean to "spill the tea" and why are young people eager to make a mess on good linen tablecloths?!',
      'I heard two teenagers whispering behind the display rack about who was "spilling tea" on the cheerleading squad.',
      'Tammy, why did someone leave a review saying: "Grandma Bonnie never gatekeeps, she shares all the vibes"?!',
      'Someone asked me to spill the tea on the boutique’s secret knotting technique, and I offered them Earl Grey!',
    ],
    grandmaTakes: [
      'I am not gatekeeping! A master craftsman never reveals her supplier! If Colonel Sanders doesn’t give you his eleven herbs, why should I give you my glass distributor?!' ,
      'Spill the tea?! If anyone spills real tea on my hand-embroidered tablecloth, they are getting a bottle of seltzer water and a sponge immediately!',
      'Gossip isn’t tea, honey, gossip is idle wind! If you have something to say, say it with a warm plate of cookies in front of everyone!',
      'I keep a gate on the vegetable garden to keep the woodchucks out—that is the only gatekeeping I endorse!',
      'If you want tea, we have chamomile, peppermint, and Darjeeling, but none of it is meant to be splashed on the floor!',
    ],
    tammyReactions: [
      'Mom, comparing your Czech bead distributor to the Colonel’s secret recipe is shockingly accurate and high-key iconic!',
      'Mom, "spilling tea" means sharing juicy gossip, nobody is endangering the hand-embroidered tablecloths!',
      'Mom, woodchuck garden gatekeeping is the wholesome content the world needs right now.',
      'Offering Earl Grey when someone asks for drama is the ultimate mom power move.',
      'Okay, but Colonel Sanders definitely had nothing on your triple-knot bead tension protocol.',
    ],
    interruptions: [
      '—Wait, did you really compare yourself to Colonel Sanders?!—',
      '—Mom, seltzer water on the linen table is immediate instinct!—',
      '—Hold on, woodchuck gatekeeping has me crying!—',
      '—Stop right there, offering Earl Grey for gossip is undefeated!—',
    ],
    punchlines: [
      'No gatekeeping here! Everyone deserves the sparkle of Bonnie’s handcrafted "{TITLE}"!',
      'Pour yourself a cup of pure handmade beauty! Tap below for "{TITLE}" at btboutiqe.com!',
      'Unmatched craftsmanship and zero drama! Grab your sparkling "{TITLE}" today!',
      'The sweetest secret in the boutique is out! Pick up your handcrafted "{TITLE}" now!',
    ],
  },
  {
    topic: 'Looksmaxxing & Jawline Chewing Gum',
    hooks: [
      'Tammy, your cousin was chewing hard rubber gum for forty minutes and said he was "looksmaxxing his jawline".',
      'Tammy, what on earth is "mewing" and why was that teenager pressing his tongue to the roof of his mouth instead of saying hello?!',
      'I saw an advertisement for special facial chewing gum to give men chiseled jawlines like Greek statues!',
      'Tammy, why are young people spending money on rubber facial workout pellets instead of chewing crusty sourdough bread?!',
      'A customer told me our beaded pens give off "hunter eyes energy". Tammy, what does that even mean?!',
    ],
    grandmaTakes: [
      'Chewing rubber to get a jawline?! In my day, if you wanted a jawline, you ate tough pot roast and chewed the crusts on your bread!',
      'Pressing your tongue to the roof of your mouth instead of answering your elders is called being rude, not "mewing"!' ,
      'Looksmaxxing?! How about soul-maxxing?! How about character-maxxing?! What’s your credit score and can you change a lawnmower sparkplug?!',
      'If a man’s jawline is so sharp it could slice provolone cheese, he is going to pop the collar on his church shirt!',
      'Hunter eyes?! The only hunter eyes in our family belong to the barn cat when she spots a field mouse near the woodpile!',
    ],
    tammyReactions: [
      'Mom, looksmaxxing is the internet rabbit hole of hyper-optimizing facial aesthetics, though chewing hard rubber is pretty unhinged.',
      'Mom, "character-maxxing and credit score maxxing" is the ultimate boomer counter-attack and it is 100% correct!',
      'Mom, slicing provolone cheese with a jawline made me spit my coffee across the counter!',
      'Mewing in silence when someone says hello is definitely awkward, I will give you that one.',
      'And yes, the barn cat definitely has the highest hunter eye rating in the township.',
    ],
    interruptions: [
      '—Wait, character-maxxing and credit scores?! Mom, you went straight for the throat!—',
      '—Mom, chewing tough pot roast for facial structure is wild!—',
      '—Hold on, slicing provolone cheese with a jawline has me wheezing!—',
      '—Stop right there, the barn cat has peak hunter eyes!—',
    ],
    punchlines: [
      'Skip the rubber gum and max out your style with Bonnie’s handmade "{TITLE}"!',
      'Pure charm that needs zero filters or looksmaxxing! Tap the link for "{TITLE}" at btboutiqe.com!',
      'The ultimate aesthetic upgrade for your everyday life! Check out "{TITLE}" today!',
      'Handmade brilliance that radiates genuine character! Snag your "{TITLE}" in the shop!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT 6: CRAFT BREAKDOWN ASMR (The Triple-Knot Tension Lab)
// ─────────────────────────────────────────────────────────────────────────────
export interface CraftScenario {
  testType: string;
  hooks: string[];
  grandmaDemos: string[];
  tammyMetrics: string[];
  interruptions: string[];
  punchlines: string[];
}

export const CRAFT_SCENARIOS: CraftScenario[] = [
  {
    testType: 'Tensile & Knot Durability Stress Test',
    hooks: [
      'Welcome to the Boutique Craft Lab! Today Tammy and I are stress-testing our handmade bead construction.',
      'Tammy, grab the counter caliper! We are putting our triple-knot tension to the ultimate durability test.',
      'Customers always ask: "Bonnie, will the beads fly everywhere if my cat knocks this pen off the desk?!"',
      'Time for the honest craftsmanship breakdown! Let’s show everyone why Bonnie’s Boutique items never snap.',
      'Tammy, show the camera the reinforced steel core and double-sealed knot on this handmade piece!',
    ],
    grandmaDemos: [
      'Listen to this snap test: I pull with both hands as hard as I pull stubborn garden weeds! Not a millimeter of give!',
      'I use bonded multi-strand jewelry wire with industrial crimp beads hidden inside the focal bead!',
      'Tap that bead against the oak counter! Hear that crisp, solid glass click? That is genuine lead-free crystal glass, not cheap plastic!',
      'I seal every knot with microscopic jewelry cement that cures for 24 hours under the shop lamp before packaging!',
      'Your father ran over one of my prototype keychains with the riding lawnmower in 2021, and the charm didn’t even bend!',
    ],
    tammyMetrics: [
      'Tensile test results: withstands 35 pounds of direct pull force! That is stronger than commercial airline luggage tags!',
      'Acoustic resonance check: perfectly balanced 4.2 kHz glass chime! Pure oddly satisfying ASMR perfection!',
      'Ergonomic balance: 32 grams total weight, centered exactly 45% along the barrel for zero hand fatigue during long writing sessions!',
      'The cat drop simulation: dropped from counter height 50 consecutive times with zero bead chipping or thread fraying!',
      'Dad’s lawnmower test is officially the most unhinged quality control metric in the handmade arts industry.',
    ],
    interruptions: [
      '—Wait, did you say Dad ran it over with the riding lawnmower?!—',
      '—Listen to that glass bead click on the microphone! That is pure ASMR!—',
      '—Hold on, 35 pounds of pull force on an eight-dollar pen?!—',
      '—Stop, the garden weeds pulling comparison is painfully accurate!—',
    ],
    punchlines: [
      'Built to survive everyday life, toddlers, and runaway lawnmowers! Grab "{TITLE}" at btboutiqe.com!',
      'Indestructible craftsmanship, unmatched handmade beauty! Tap below for our "{TITLE}"!',
      'Feel the difference of genuine glass and steel! Check out Bonnie’s handmade "{TITLE}" today!',
      'The smoothest, most durable pen you will ever hold! Pick up your "{TITLE}" in the boutique!',
    ],
  },
  {
    testType: 'Tactile Ergonomics & Bead Spinning Friction',
    hooks: [
      'Let’s talk tactile ergonomics! Tammy, explain why people cannot stop spinning the spacer beads on this item.',
      'Boutique sensory test: showing why our beaded creations are the ultimate discreet desk fidget.',
      'Tammy, watch the macro camera! Look at the smooth micro-clearance between the crystal rondelles.',
      'Time for a sensory breakdown: why Bonnie’s handmade trinkets satisfy the brain like nothing else.',
      'Look at this smooth glide! Tammy, give them the technical engineering specs on the bead spacing!',
    ],
    grandmaDemos: [
      'I leave exactly half a millimeter of breathing room so every bead spins smoothly between your thumb and forefinger!',
      'The silicone spacer rings cushion each glass bead so there is zero grinding or pinching when you roll them!',
      'Feel the texture transition: smooth fire-polished crystal into cool frosted glass into detailed metal filigree!',
      'It’s soothing! When I’m on hold with the pharmacy for forty minutes, spinning these beads keeps my blood pressure sweet!',
      'I tested seventeen different thread coatings until I found the one that feels like silk velvet between the fingers!',
    ],
    tammyMetrics: [
      'Friction coefficient: virtually zero! The rotational glide is butter-smooth and completely silent during Zoom meetings!',
      'Haptic feedback rating: 10/10! The sensory contrast between faceted crystal and matte silicone is top-tier brain stimulus!',
      'Stealth fidget capability: 100% silent! You can spin this through an entire university lecture and nobody hears a thing!',
      'Weighted inertia: the pen barrel rotates with natural momentum, making note-taking feel like gliding on ice!',
      'Pharmacy hold-music therapy: Mom’s clinical trial with n=1 patient confirms 100% stress reduction!',
    ],
    interruptions: [
      '—Wait, listen to that silent spin on the close-up mic!—',
      '—Mom, the half-millimeter breathing room is engineering genius!—',
      '—Hold on, pharmacy hold music therapy is hilarious!—',
      '—Stop right there, the haptic contrast on that focal bead is insane!—',
    ],
    punchlines: [
      'The ultimate everyday fidget and writing instrument! Grab your handcrafted "{TITLE}" at btboutiqe.com!',
      'Silky smooth tactile bliss for your desk or purse! Tap below for our "{TITLE}"!',
      'Handcrafted comfort you can feel in every spin! Check out Bonnie’s handmade "{TITLE}" today!',
      'Treat your hands to true handmade perfection! Pick up your very own "{TITLE}" in the shop!',
    ],
  },
  {
    testType: 'Resonance & Glass Bead Acoustic Clack Test',
    hooks: [
      'Welcome back to the Craft Tension Lab! Today Tammy and I are measuring the acoustic resonance of our genuine glass beads.',
      'Tammy, bring the studio microphone close! Listen to the crisp, melodic chime when these crystal facets tap together.',
      'People always ask: "Bonnie, how can you tell genuine fire-polished crystal from cheap acrylic plastic?!"',
      'Time for an auditory quality check: why Bonnie’s Boutique beads sound like miniature crystal bells.',
      'Tammy, let’s run the 4.2 kHz frequency test on this freshly beaded handcrafted item!',
    ],
    grandmaDemos: [
      'Tap the beads together gently right by the microphone! Hear that bell-like ring? That is pure lead-free furnace glass!',
      'Cheap plastic beads make a dull, hollow thud like tapping a plastic milk jug with a pencil! No musical resonance at all!',
      'I select crystal rondelles with fire-polished facets that catch both light and sound with crystal purity!',
      'When I string a batch in the evening, the rhythmic clicking is as soothing as raindrops on a tin roof!',
      'Every single bead has smooth deburred holes so the thread glides silently without abrasive grinding!',
    ],
    tammyMetrics: [
      'Acoustic frequency analysis: clean harmonic spike at 4.2 kHz with rich overtone decay! Certified high-fidelity ASMR bliss!',
      'Plastic vs Glass test: genuine glass demonstrates 5x greater acoustic density and zero hollow dampening!',
      'Decibel rating: gentle 28 dB click—satisfyingly crisp to the holder without disturbing colleagues in quiet offices!',
      'Smooth hole deburring confirmed under 20x magnification: zero burrs, zero micro-fractures, 100% thread longevity!',
      'Mom’s raindrop-on-a-tin-roof analogy is mathematically backed by the acoustic damping curve.',
    ],
    interruptions: [
      '—Wait, listen to that crystal ring right by the microphone! Pure goosebumps!—',
      '—Mom, the plastic milk jug comparison is spot on!—',
      '—Hold on, 4.2 kHz harmonic spike on an eight-dollar pen?!—',
      '—Stop, that bead clack sound is addictive!—',
    ],
    punchlines: [
      'Experience the crisp, musical perfection of genuine crystal! Grab "{TITLE}" at btboutiqe.com!',
      'Oddly satisfying ASMR in every tap! Tap below for Bonnie’s handmade "{TITLE}"!',
      'Hear and feel the difference of real handcrafted glass! Check out "{TITLE}" today!',
      'Sweet acoustic bliss for your daily routine! Pick up your very own "{TITLE}" in the boutique!',
    ],
  },
  {
    testType: 'Drop & Impact Resistance Counter Drop Test',
    hooks: [
      'Lab experiment time! Tammy, let’s conduct the dreaded Countertop Drop Test on our handmade creations.',
      'Tammy, get the slow-motion camera ready! We are simulating what happens when your trinket takes a tumble.',
      'Customers often wonder: "What happens if this drops on ceramic tile or asphalt in the grocery store parking lot?!"',
      'Time to prove why our shock-absorbing silicone spacers make our beadwork virtually indestructible.',
      'Tammy, drop this piece from four feet high directly onto the solid oak counter and let’s inspect the results!',
    ],
    grandmaDemos: [
      'Watch this: I drop it right onto the oak table! Bounce! Not a chip, not a crack, not a loose crimp anywhere!',
      'The silicone spacer cushions act like miniature shock absorbers between every crystal, absorbing 90% of the impact kinetic energy!',
      'I dropped one of these down a flight of wooden cellar stairs in 2023 and the only damage was a dent in the basement floorboard!',
      'The solid steel core inside the pen barrel prevents bending or snapping even when dropped on concrete sidewalks!',
      'Every charm clasp is forged from solid zinc-alloy with double-spring tension that never pops open accidentally!',
    ],
    tammyMetrics: [
      'Impact deceleration metrics: silicone rings dissipate 88.4% of kinetic shock before it reaches the glass core!',
      '50-cycle drop test passed with zero structural degradation, zero facet chipping, and 100% retention!',
      'Basement stairs incident confirmed: Mom’s pen survived a 12-step descent with zero casualties!',
      'Spring-clasp retention force: requires 8.5 pounds of direct pull to open, eliminating accidental detachments in purses!',
      'Verdict: Drop-proof, toddler-proof, and cellar-stair-proof engineering certified by the boutique!',
    ],
    interruptions: [
      '—Wait, did you really drop it down the cellar stairs?!—',
      '—Listen to that bounce on the oak counter! Zero damage!—',
      '—Hold on, shock-absorbing silicone spacers are genius!—',
      '—Stop right there, 88% kinetic dissipation is aerospace level!—',
    ],
    punchlines: [
      'Built tough to survive everyday drops and cellar stairs! Grab "{TITLE}" at btboutiqe.com!',
      'Unstoppable handmade durability with dazzling beauty! Tap below for your "{TITLE}"!',
      'Never fear dropped keys or pens again! Check out Bonnie’s "{TITLE}" today!',
      'Indestructible charm you can rely on every single day! Pick up "{TITLE}" now!',
    ],
  },
  {
    testType: 'UV & Sunlight Oxidation Colorfastness Lab',
    hooks: [
      'Welcome to the Colorfastness Lab! Tammy, let’s demonstrate why our beads never fade or turn yellow in the sun.',
      'Tammy, show the camera the comparison between cheap dyed plastic and our furnace-vitrified glass beads.',
      'A customer asked: "Bonnie, if I leave this keychain on my car dashboard in the hot July sun, will it bleach out?!"',
      'Time for the scientific breakdown on UV stability and non-reactive electroplated metal finishes.',
      'Tammy, bring up the spectrum analyzer! Let’s show why Bonnie’s Boutique colors stay vivid for decades.',
    ],
    grandmaDemos: [
      'These colors aren’t painted on the surface, Tammy! The pigment is fused directly into molten glass at 1,800 degrees Fahrenheit!',
      'I left a prototype on the south-facing boutique windowsill for two full years through snow and blazing summer heat! Not a shade of difference!',
      'Cheap beads use chemical dyes that fade into chalky pastel after three weeks on a car dashboard—we never touch them!',
      'Our metal charms have dual-layer electrophoretic coating that prevents green tarnish from sweaty summer hands!',
      'You could take this to the beach every day of July and the ocean salt and sun wouldn’t touch the sparkle!',
    ],
    tammyMetrics: [
      'UV radiation exposure test: 500 hours of simulated solar irradiance yielded 0.0% delta-E color shift!',
      'Vitrified mineral pigment: permanently locked inside the silica lattice structure, 100% impervious to photobleaching!',
      'Anti-tarnish electroplating: passed 48-hour ASTM B117 salt spray corrosion testing with zero oxidation!',
      'Windowsill endurance test: Mom’s two-year passive solar test confirms zero yellowing and 100% gloss retention!',
      'Bottom line: Your dashboard cannot defeat 1,800-degree molten silica, folks!',
    ],
    interruptions: [
      '—Wait, two full years on the south-facing windowsill?!—',
      '—Mom, 1,800 degrees Fahrenheit is literal volcanic heat!—',
      '—Hold on, 0.0% color shift under 500 hours of UV?!—',
      '—Stop, the salt spray test confirms beach-ready jewelry!—',
    ],
    punchlines: [
      'Permanent brilliance that never fades in the sun! Grab your handcrafted "{TITLE}" at btboutiqe.com!',
      'Furnace-vitrified sparkle made to last a lifetime! Tap below for "{TITLE}"!',
      'Vibrant, tarnish-free elegance for every sunny day! Check out Bonnie’s "{TITLE}" today!',
      'Sunproof and beach-ready handmade beauty! Pick up your "{TITLE}" in the shop!',
    ],
  },
  {
    testType: 'Micro-Clearance & Weight Distribution Balancing',
    hooks: [
      'Lab session in progress! Tammy, let’s demonstrate the micro-clearance and weight balancing on our pens.',
      'Tammy, place this handmade pen on the precision balancing fulcrum! Look where the center of mass rests.',
      'Ever wonder why some pens give you hand cramps after three sentences while ours feel effortless?!',
      'Time for an engineering review on balance, rotational inertia, and fatigue-free handwriting.',
      'Tammy, show them the digital scale and balance caliper on this handcrafted boutique piece!',
    ],
    grandmaDemos: [
      'I weigh each bead individually before assembly so the heaviest focal bead sits right at the natural pivot point of your hand!',
      'If the top is too heavy, the pen wants to flop backward! If it’s too light, you have to press down hard like writing on granite!',
      'I leave exactly 0.5 mm of axial play so the beads can spin smoothly without rattling or shifting out of place!',
      'I wrote ninety thank-you notes for the church Christmas bazaar in one sitting with this pen and didn’t have a single cramp!',
      'It writes like butter on a hot griddle! Smooth, steady, and perfectly centered between your fingers!',
    ],
    tammyMetrics: [
      'Center of mass calibration: balanced exactly at 44.5% of the total barrel length from the ballpoint tip!',
      'Ergonomic hand fatigue analysis: reduces grip pressure requirement by 40% compared to unweighted disposable plastic pens!',
      'Micro-clearance tolerance: calibrated to 0.48 mm +/- 0.03 mm for silent, butter-smooth fidget spinning!',
      'Ninety thank-you notes endurance trial: Mom’s personal handwriting record with zero hand strain confirmed!',
      'Rotational inertia: provides natural gyroscopic stabilization for cursive penmanship and signature flourishes!',
    ],
    interruptions: [
      '—Wait, ninety thank-you notes in one sitting?!—',
      '—Mom, the hot griddle butter comparison is hilarious!—',
      '—Hold on, 44.5% center of mass calibration on an eight-dollar pen?!—',
      '—Stop, gyroscopic stabilization for cursive writing is genius!—',
    ],
    punchlines: [
      'Effortless handwriting with perfect ergonomic balance! Grab "{TITLE}" at btboutiqe.com!',
      'Butter-smooth writing that eliminates hand fatigue! Tap below for Bonnie’s "{TITLE}"!',
      'Experience the joy of perfectly balanced craft! Check out our handcrafted "{TITLE}" today!',
      'The smoothest pen you will ever own! Pick up your very own "{TITLE}" in the shop!',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BIDIRECTIONAL REACTION CLIP & SCENARIO REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes any format of video clip path, filename, or scene alias
 * into a standardized basename (e.g. "hermit_crab.mp4").
 */
export function normalizeClipFileName(clipRef?: string): string | undefined {
  if (!clipRef || typeof clipRef !== 'string') return undefined;
  const trimmed = clipRef.trim();
  if (!trimmed) return undefined;

  const base = trimmed.split(/[\\/]/).pop() || trimmed;
  const cleanBase = base.split('?')[0];

  const SCENE_ALIASES: Record<string, string> = {
    mantis_shrimp: 'hermit_crab.mp4',
    honey_badger: 'savanna_meerkat.mp4',
    octopus_architect: 'octopus_observatory.mp4',
    capybara_spa: 'baby_capybaras.mp4',
    penguin_heist: 'penguins_slowmo.mp4',
    anglerfish: 'phantom_jellyfish.mp4',
  };

  if (SCENE_ALIASES[cleanBase]) {
    return SCENE_ALIASES[cleanBase];
  }

  if (!cleanBase.includes('.')) {
    return `${cleanBase}.mp4`;
  }

  return cleanBase;
}

/**
 * Bidirectional Lookup: Find WildlifeScenario by clip filename, path, or scene identifier.
 */
export function getWildlifeScenarioByClip(clipRef: string): WildlifeScenario | undefined {
  const norm = normalizeClipFileName(clipRef);
  if (!norm) return undefined;

  let found = WILDLIFE_SCENARIOS.find(
    (s) => s.clipFile.toLowerCase() === norm.toLowerCase()
  );
  if (found) return found;

  found = WILDLIFE_SCENARIOS.find(
    (s) => s.scene.toLowerCase() === clipRef.toLowerCase()
  );
  if (found) return found;

  const baseNoExt = norm.replace(/\.mp4$/i, '').toLowerCase();
  found = WILDLIFE_SCENARIOS.find(
    (s) => s.clipFile.replace(/\.mp4$/i, '').toLowerCase() === baseNoExt ||
           s.scene.toLowerCase() === baseNoExt
  );
  return found;
}

/**
 * Reverse Lookup: Find clipFile by scene identifier.
 */
export function getClipFileForScene(scene: string): string {
  const scenario = WILDLIFE_SCENARIOS.find(
    (s) => s.scene === scene || s.clipFile === scene
  );
  if (scenario) return scenario.clipFile;
  const norm = normalizeClipFileName(scene);
  return norm || 'octopus_observatory.mp4';
}

/**
 * Returns all reaction clips registered with scenarios.
 */
export function getAllRegisteredWildlifeClips(): string[] {
  return WILDLIFE_SCENARIOS.map((s) => s.clipFile);
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC TITLE GENERATOR (8 Formulas Per Format With Product Parameterization)
// ─────────────────────────────────────────────────────────────────────────────

interface DynamicTitleOptions {
  format: ShowFormatId;
  productClean: string;
  topicOrEntity: string;
  seed: number;
  excludeTitles?: string[];
}

export function generateDynamicTitle(options: DynamicTitleOptions): string {
  const { format, productClean, topicOrEntity, seed, excludeTitles = [] } = options;
  const lowerExcludes = new Set(excludeTitles.map((t) => t.trim().toLowerCase()));

  const templatesByFormat: Record<ShowFormatId, Array<(topic: string, prod: string) => string>> = {
    wild_nature_commentary: [
      (t, p) => `${t} vs. Grandma's Tea: ${p}`,
      (t, p) => `Channel 42: ${t} & The ${p}`,
      (t, p) => `Wildlife Watch: ${t} Meets ${p}`,
      (t, p) => `${t} vs. ${p}: The Boutique Showdown`,
      (t, p) => `Boutique Field Report: ${t} & ${p}`,
      (t, p) => `Grandma's Tea vs. ${t} (ft. ${p})`,
      (t, p) => `The Great ${t} Chaos (ft. ${p})`,
      (t, p) => `Wild Encounter: ${t} and the Mystery of ${p}`,
    ],
    chaotic_grandma_hot_takes: [
      (t, p) => `Grandma Unfiltered: ${t} & ${p}`,
      (t, p) => `Bonnie's Hot Take: Why ${p} Beats ${t}`,
      (t, p) => `Grandma's Logic: ${t} vs. ${p}`,
      (t, p) => `Unhinged Wisdom: ${t} (ft. ${p})`,
      (t, p) => `Grandma vs. Modern Life: ${t} & ${p}`,
      (t, p) => `The Common Sense Breakdown: ${t} (ft. ${p})`,
      (t, p) => `Bonnie Tells All: ${t} Meets ${p}`,
      (t, p) => `Hot Takes & High Tea: ${t} vs. ${p}`,
    ],
    cozy_boutique_lore: [
      (t, p) => `Boutique Chronicles: ${t} & ${p}`,
      (t, p) => `Behind the Counter: ${t} (ft. ${p})`,
      (t, p) => `Shop Tales: The Legend of ${t} & ${p}`,
      (t, p) => `The Secret of ${t}: A ${p} Story`,
      (t, p) => `Midnight in the Boutique: ${t} & ${p}`,
      (t, p) => `Trinket Folklore: ${t} and the ${p}`,
      (t, p) => `Bonnie's Memories: ${t} Meets ${p}`,
      (t, p) => `Cozy Lore: ${t} (ft. ${p})`,
    ],
    vintage_relic_debates: [
      (t, p) => `Relic Radar: ${p} (+100 Charm)`,
      (t, p) => `Mythic Appraisal: ${p} Under Review`,
      (t, p) => `Tammy's Lore Inspection: The Legendary ${p}`,
      (t, p) => `Is ${p} an S-Tier Artifact?`,
      (t, p) => `Relic Audit: ${p} vs. Grandma's Blessing`,
      (t, p) => `Stat Check: The Mystical ${p}`,
      (t, p) => `Artifact Analysis: Why ${p} is Overpowered`,
      (t, p) => `Shop Relic Debates: The Sacred ${p}`,
    ],
    gen_z_culture_clash: [
      (t, p) => `Aura Check: ${t} & ${p}`,
      (t, p) => `Brainrot vs. Bonnie: ${t} (ft. ${p})`,
      (t, p) => `Tammy Roasts Bonnie: ${t} & ${p}`,
      (t, p) => `Main Character Energy: ${t} vs. ${p}`,
      (t, p) => `Culture Shock: ${t} Meets ${p}`,
      (t, p) => `The Rizz Test: ${t} & ${p}`,
      (t, p) => `Generational Clash: ${t} (ft. ${p})`,
      (t, p) => `Aura Review: Can ${p} Cure ${t}?`,
    ],
    craft_breakdown_asmr: [
      (t, p) => `Craft Breakdown: ${t} on ${p}`,
      (t, p) => `Tensile Lab: Can ${p} Survive ${t}?`,
      (t, p) => `Handmade ASMR Stress Test: ${p} vs. ${t}`,
      (t, p) => `Durability Audit: Testing ${p} (${t})`,
      (t, p) => `Engineering Review: ${p} Under ${t}`,
      (t, p) => `Tactile Friction Lab: ${p} & ${t}`,
      (t, p) => `ASMR Quality Inspection: ${p} (${t})`,
      (t, p) => `The Ultimate Tension Test: ${t} on ${p}`,
    ],
  };

  const templates = templatesByFormat[format] || templatesByFormat.craft_breakdown_asmr;
  const startIdx = Math.floor(Math.abs(Math.sin(seed * 4391 + 17291)) * templates.length);

  for (let i = 0; i < templates.length; i++) {
    const fn = templates[(startIdx + i) % templates.length];
    const candidate = fn(topicOrEntity, productClean);
    if (!lowerExcludes.has(candidate.trim().toLowerCase())) {
      return candidate;
    }
  }

  // Failsafe fallback if all variants are present in excludes
  const fallback = templates[startIdx](topicOrEntity, productClean);
  return `${fallback} (Vol. ${Math.abs(seed % 100) + 1})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER PROCEDURAL GENERATOR FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a non-repetitive, high-quality SkitTemplate using procedural slot filling.
 */
export function generateProceduralCommentary(
  context: ProceduralSlotContext
): SkitTemplate {
  const { product, format, seed = Date.now() } = context;
  const productClean = cleanTitle(product.title);

  const skitId = `skit_proc_${format}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  let title = '';
  let description = '';
  let defaultBackdrop: BackdropId = 'cozy_night_shop';
  let beats: SkitBeat[] = [];

  switch (format) {
    case 'wild_nature_commentary': {
      let scenario: WildlifeScenario;

      if (context.clipFile) {
        const matched = getWildlifeScenarioByClip(context.clipFile);
        scenario = matched || pickRandom(WILDLIFE_SCENARIOS, seed);
      } else {
        const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
          ? WILDLIFE_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.animal.toLowerCase()) || k.includes(s.clipFile.toLowerCase())))
          : WILDLIFE_SCENARIOS;
        const pool = available.length > 0 ? available : WILDLIFE_SCENARIOS;
        const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
        scenario = pool[(Math.abs(seed) + offset) % pool.length];
      }

      defaultBackdrop = 'cozy_night_shop';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.animal,
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Bonnie and Tammy react to Channel 42 footage of a ${scenario.animal}.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const twist = pickRandom(scenario.grandmaTwists, seed + 2);
      const rebuttal = pickRandom(scenario.tammyRebuttals, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'tammy',
          expression: 'shocked',
          action: 'turn',
          dialogue: hook,
          durationSec: 4.8,
          soundEffect: 'gasp',
          natGeoScene: scenario.scene,
        },
        {
          id: `${skitId}_b2`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'sip tea',
          dialogue: twist,
          durationSec: 5.6,
          soundEffect: 'tea_sip',
          natGeoScene: scenario.scene,
        },
        {
          id: `${skitId}_b3`,
          speaker: 'tammy',
          expression: 'eye-rolling daughter',
          action: 'turn',
          dialogue: `${rebuttal} ${interrupt}`,
          durationSec: 5.2,
          soundEffect: 'laugh',
          natGeoScene: scenario.scene,
        },
        {
          id: `${skitId}_b4`,
          speaker: 'bonnie',
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: punchline,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
          natGeoScene: scenario.scene,
        },
      ];
      break;
    }

    case 'chaotic_grandma_hot_takes': {
      const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
        ? HOT_TAKE_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.topic.toLowerCase())))
        : HOT_TAKE_SCENARIOS;
      const pool = available.length > 0 ? available : HOT_TAKE_SCENARIOS;
      const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
      const scenario = pool[(Math.abs(seed) + offset) % pool.length];

      defaultBackdrop = 'morning_coffee_prep';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.topic,
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Bonnie shares unhinged common-sense logic regarding ${scenario.topic}.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const logic = pickRandom(scenario.grandmaLogics, seed + 2);
      const reaction = pickRandom(scenario.tammyReactions, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'bonnie',
          expression: 'shocked',
          action: 'gasp',
          dialogue: hook,
          durationSec: 5.2,
          soundEffect: 'gasp',
        },
        {
          id: `${skitId}_b2`,
          speaker: 'tammy',
          expression: 'eye-rolling daughter',
          action: 'turn',
          dialogue: `${interrupt} ${reaction}`,
          durationSec: 5.4,
          soundEffect: 'laugh',
        },
        {
          id: `${skitId}_b3`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'sip tea',
          dialogue: logic,
          durationSec: 5.6,
          soundEffect: 'tea_sip',
        },
        {
          id: `${skitId}_b4`,
          speaker: 'tammy',
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: punchline,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
        },
      ];
      break;
    }

    case 'cozy_boutique_lore': {
      const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
        ? LORE_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.legend.toLowerCase())))
        : LORE_SCENARIOS;
      const pool = available.length > 0 ? available : LORE_SCENARIOS;
      const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
      const scenario = pool[(Math.abs(seed) + offset) % pool.length];

      defaultBackdrop = 'rainy_window_crafting';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.legend,
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Bonnie and Tammy reminisce about ${scenario.legend}.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const tale = pickRandom(scenario.grandmaTales, seed + 2);
      const rebuttal = pickRandom(scenario.tammyRebuttals, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'turn',
          dialogue: hook,
          durationSec: 5.0,
          soundEffect: 'chime',
        },
        {
          id: `${skitId}_b2`,
          speaker: 'tammy',
          expression: 'eye-rolling daughter',
          action: 'turn',
          dialogue: `${interrupt} ${rebuttal}`,
          durationSec: 5.4,
          soundEffect: 'laugh',
        },
        {
          id: `${skitId}_b3`,
          speaker: 'bonnie',
          expression: 'happy',
          action: 'pack box',
          dialogue: tale,
          durationSec: 5.8,
          soundEffect: 'box_tap',
        },
        {
          id: `${skitId}_b4`,
          speaker: 'tammy', // FIXED: Tammy speaks closing beat, ensuring crisp alternating turn-taking
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: punchline,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
        },
      ];
      break;
    }

    case 'vintage_relic_debates': {
      const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
        ? RELIC_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.tier.toLowerCase())))
        : RELIC_SCENARIOS;
      const pool = available.length > 0 ? available : RELIC_SCENARIOS;
      const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
      const scenario = pool[(Math.abs(seed) + offset) % pool.length];

      defaultBackdrop = 'cozy_night_shop';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.relicClass || 'Mythic Artifact',
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Tammy runs RPG Item Appraisals on Bonnie's handmade creations.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const appraisal = pickRandom(scenario.tammyAppraisals, seed + 2);
      const blessing = pickRandom(scenario.grandmaBlessings, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'tammy',
          expression: 'shocked',
          action: 'gasp',
          dialogue: hook,
          durationSec: 4.8,
          soundEffect: 'blip',
          showAppraisalCard: true,
        },
        {
          id: `${skitId}_b2`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'sip tea',
          dialogue: blessing,
          durationSec: 5.6,
          soundEffect: 'tea_sip',
          showAppraisalCard: true,
        },
        {
          id: `${skitId}_b3`,
          speaker: 'tammy',
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: `${interrupt} ${appraisal}`,
          propId: product.id,
          durationSec: 5.6,
          soundEffect: 'chime',
          showAppraisalCard: true,
        },
        {
          id: `${skitId}_b4`,
          speaker: 'bonnie',
          expression: 'happy',
          action: 'turn',
          dialogue: punchline,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
          showAppraisalCard: true,
        },
      ];
      break;
    }

    case 'gen_z_culture_clash': {
      const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
        ? CULTURE_CLASH_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.topic.toLowerCase())))
        : CULTURE_CLASH_SCENARIOS;
      const pool = available.length > 0 ? available : CULTURE_CLASH_SCENARIOS;
      const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
      const scenario = pool[(Math.abs(seed) + offset) % pool.length];

      defaultBackdrop = 'cozy_night_shop';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.topic,
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Bonnie and Tammy collide over modern internet slang and grandma wisdom.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const take = pickRandom(scenario.grandmaTakes, seed + 2);
      const reaction = pickRandom(scenario.tammyReactions, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'bonnie',
          expression: 'shocked',
          action: 'turn',
          dialogue: hook,
          durationSec: 5.0,
          soundEffect: 'gasp',
        },
        {
          id: `${skitId}_b2`,
          speaker: 'tammy',
          expression: 'eye-rolling daughter',
          action: 'turn',
          dialogue: `${interrupt} ${reaction}`,
          durationSec: 5.4,
          soundEffect: 'laugh',
        },
        {
          id: `${skitId}_b3`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'sip tea',
          dialogue: take,
          durationSec: 5.4,
          soundEffect: 'tea_sip',
        },
        {
          id: `${skitId}_b4`,
          speaker: 'tammy',
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: punchline,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
        },
      ];
      break;
    }

    case 'craft_breakdown_asmr':
    default: {
      const available = context.recentScenarioKeys && context.recentScenarioKeys.length > 0
        ? CRAFT_SCENARIOS.filter(s => !context.recentScenarioKeys!.some(k => k.includes(s.testType.toLowerCase())))
        : CRAFT_SCENARIOS;
      const pool = available.length > 0 ? available : CRAFT_SCENARIOS;
      const offset = context.scenarioOffset !== undefined ? context.scenarioOffset : 0;
      const scenario = pool[(Math.abs(seed) + offset) % pool.length];

      defaultBackdrop = 'closing_time_lofi';
      title = generateDynamicTitle({
        format,
        productClean,
        topicOrEntity: scenario.testType,
        seed,
        excludeTitles: context.excludeTitles,
      });
      description = `Engineering analysis of Bonnie's handmade jewelry construction.`;

      const hook = pickRandom(scenario.hooks, seed + 1);
      const demo = pickRandom(scenario.grandmaDemos, seed + 2);
      const metric = pickRandom(scenario.tammyMetrics, seed + 3);
      const interrupt = pickRandom(scenario.interruptions, seed + 4);
      const punchlineRaw = pickRandom(scenario.punchlines, seed + 5);
      const punchline = punchlineRaw.replace('{TITLE}', productClean);

      beats = [
        {
          id: `${skitId}_b1`,
          speaker: 'tammy',
          expression: 'happy',
          action: 'turn',
          dialogue: hook,
          durationSec: 5.0,
          soundEffect: 'blip',
        },
        {
          id: `${skitId}_b2`,
          speaker: 'bonnie',
          expression: 'proud grandma',
          action: 'hold trinket',
          dialogue: demo,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'box_tap',
        },
        {
          id: `${skitId}_b3`,
          speaker: 'tammy',
          expression: 'shocked',
          action: 'turn',
          dialogue: `${interrupt} ${metric}`,
          durationSec: 5.4,
          soundEffect: 'laugh',
        },
        {
          id: `${skitId}_b4`,
          speaker: 'bonnie',
          expression: 'laughing',
          action: 'hold trinket',
          dialogue: punchline,
          propId: product.id,
          durationSec: 5.8,
          soundEffect: 'chime',
          fourthWallEffect: 'camera_zoom',
        },
      ];
      break;
    }
  }

  if (context.clipFile) {
    const matchedScenario = getWildlifeScenarioByClip(context.clipFile);
    const fallbackScene = (matchedScenario?.scene ||
      context.clipFile.replace(/\.mp4$/i, '')) as NatGeoScene;
    for (const b of beats) {
      if (!b.natGeoScene) {
        b.natGeoScene = fallbackScene;
      }
    }
  }

  const durationSeconds = Math.round(beats.reduce((acc, b) => acc + (b.durationSec || 5), 0));

  return {
    id: skitId,
    title,
    category: format,
    durationSeconds,
    defaultBackdrop,
    defaultPropId: product.id,
    description,
    beats,
  };
}
