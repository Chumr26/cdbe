require('dotenv').config();
const { connectDB, closeDB } = require('../config/database');
const bcrypt = require('bcrypt');
const { getBookCover } = require('../utils/bookcoverHelper');
const { faker } = require('@faker-js/faker');

async function seedData() {
    try {
        const db = await connectDB();

        console.log('🌱 Seeding database...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await db.collection('users').deleteMany({});
        await db.collection('categories').deleteMany({});
        await db.collection('products').deleteMany({});
        await db.collection('carts').deleteMany({});
        await db.collection('orders').deleteMany({});
        console.log('✅ Cleared existing data\n');

        // ---------------------------------------------------------
        // 1. Seed Categories
        // ---------------------------------------------------------
        console.log('📚 Creating categories...');
        const categoryList = [
            {
                name: 'Fiction',
                slug: 'fiction',
                description: 'Fictional books and novels',
            },
            {
                name: 'Non-Fiction',
                slug: 'non-fiction',
                description: 'Real-world topics and biographies',
            },
            {
                name: 'Science',
                slug: 'science',
                description: 'Science and technology books',
            },
            {
                name: 'Technology',
                slug: 'technology',
                description: 'Programming and tech books',
            },
            {
                name: 'Self-Help',
                slug: 'self-help',
                description: 'Personal development and motivation',
            },
            {
                name: 'History',
                slug: 'history',
                description: 'Historical events and figures',
            },
            {
                name: 'Biography',
                slug: 'biography',
                description: 'Life stories of famous people',
            },
            {
                name: 'Children',
                slug: 'children',
                description: 'Books for kids',
            },
            {
                name: 'Romance',
                slug: 'romance',
                description: 'Love and relationships',
            },
            {
                name: 'Thriller',
                slug: 'thriller',
                description: 'Suspense and mystery books',
            },
        ];

        const categories = await db.collection('categories').insertMany(
            categoryList.map((c) => ({
                ...c,
                parentCategory: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }))
        );
        console.log(`✅ Created ${categories.insertedCount} categories\n`);

        // ---------------------------------------------------------
        // 2. Seed Users
        // ---------------------------------------------------------
        console.log('👤 Creating users...');
        const usersToSeed = [];

        // 2.1 Admin User
        const adminPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD || 'admin123',
            10
        );
        usersToSeed.push({
            email: process.env.ADMIN_EMAIL || 'admin@bookstore.com',
            password: adminPassword,
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User',
            phoneNumber: '+1234567890',
            addresses: [],
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // 2.2 Sample Customer
        const userPassword = await bcrypt.hash('password123', 10);
        usersToSeed.push({
            email: 'john@test.com',
            password: userPassword,
            role: 'customer',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+0987654321',
            addresses: [
                {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'USA',
                    isDefault: true,
                },
            ],
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // 2.3 Generate 48 random users
        for (let i = 0; i < 48; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            usersToSeed.push({
                email: faker.internet
                    .email({ firstName, lastName })
                    .toLowerCase(),
                password: userPassword,
                role: 'customer',
                firstName: firstName,
                lastName: lastName,
                phoneNumber: faker.phone.number(),
                addresses: [
                    {
                        street: faker.location.streetAddress(),
                        city: faker.location.city(),
                        state: faker.location.state(),
                        zipCode: faker.location.zipCode(),
                        country: faker.location.country(),
                        isDefault: true,
                    },
                ],
                isEmailVerified: faker.datatype.boolean(),
                createdAt: faker.date.past(),
                updatedAt: new Date(),
            });
        }

        const insertedUsers = await db
            .collection('users')
            .insertMany(usersToSeed);
        const userIdList = Object.values(insertedUsers.insertedIds);
        console.log(`✅ Created ${insertedUsers.insertedCount} users\n`);

        // ---------------------------------------------------------
        // 3. Seed Real Products
        // ---------------------------------------------------------
        console.log('📖 Seeding real books and fetching covers...');

        // Curated list of real books with ISBNs
        const realBooksList = [
            // Fiction
            {
                title: 'The Great Gatsby',
                isbn: '9780743273565',
                author: 'F. Scott Fitzgerald',
                category: 'Fiction',
                publisher: 'Scribner',
                publicationYear: 2004,
                pageCount: 180,
                description:
                    'Nick Carraway is pulled into the glittering orbit of Jay Gatsby, a man who throws lavish parties to hide a single-minded longing. Set in the Jazz Age, the novel peels back the shine to reveal obsession, status, and quiet heartbreak. It is a sharp portrait of wealth and reinvention, and a haunting critique of the American Dream. Frequently taught and endlessly quoted, it remains one of the defining American classics.',
            },
            {
                title: 'To Kill a Mockingbird',
                isbn: '9780061120084',
                author: 'Harper Lee',
                category: 'Fiction',
                publisher: 'Harper Perennial',
                publicationYear: 2006,
                pageCount: 324,
                description:
                    'In 1930s Alabama, Scout Finch watches her father, lawyer Atticus Finch, defend a Black man falsely accused of a terrible crime. Through a child’s perspective, the story blends humor and warmth with a clear-eyed view of injustice and moral courage. The novel explores empathy, integrity, and the costs of doing the right thing in a divided community. Winner of the Pulitzer Prize, it is both a moving coming-of-age story and a timeless staple.',
            },
            {
                title: '1984',
                isbn: '9780451524935',
                author: 'George Orwell',
                category: 'Fiction',
                publisher: 'Signet Classic',
                publicationYear: 1961,
                pageCount: 328,
                description:
                    'Winston Smith lives under constant surveillance in Oceania, where the Party controls information, memory, and even language. As he searches for truth and intimacy, every choice becomes dangerous, and rebellion turns into a psychological battle. The novel examines propaganda, power, and how reality can be engineered. Tense and unsettling, this classic shaped modern dystopian fiction and our vocabulary for authoritarian control.',
            },
            {
                title: 'Pride and Prejudice',
                isbn: '9780141439518',
                author: 'Jane Austen',
                category: 'Fiction',
                publisher: 'Penguin Classics',
                publicationYear: 2002,
                pageCount: 480,
                description:
                    'Elizabeth Bennet navigates family pressures and social expectations while sparring with the proud, complicated Mr. Darcy. Austen mixes romance with razor-sharp social satire, exposing how class, reputation, and first impressions distort judgment. The story rewards readers with wit, warmth, and one of literature’s most satisfying slow-burn arcs. Beloved for its dialogue and insight, it remains a landmark of English literature.',
            },
            {
                title: 'The Catcher in the Rye',
                isbn: '9780316769488',
                author: 'J.D. Salinger',
                category: 'Fiction',
                publisher: 'Little, Brown and Company',
                publicationYear: 1991,
                pageCount: 277,
                description:
                    'After leaving prep school, Holden Caulfield wanders New York City for a few restless days, masking grief and fear with sarcasm and bravado. His voice captures the loneliness of adolescence and the anxiety of stepping into adulthood. The novel explores alienation, innocence, and the longing for authenticity in a world that feels false. Iconic and often debated, it remains a defining work of twentieth-century American fiction.',
            },

            // Technology
            {
                title: 'Clean Code',
                isbn: '9780132350884',
                author: 'Robert C. Martin',
                category: 'Technology',
                publisher: 'Prentice Hall',
                publicationYear: 2008,
                pageCount: 464,
                description:
                    'Robert C. Martin argues that readability is a feature, not a luxury, and shows how small decisions compound into maintainable systems. You will learn practical habits around naming, functions, testing, refactoring, and design boundaries that keep complexity under control. The book emphasizes craft: writing code that teammates can understand, change, and trust. Widely recommended in professional teams, it is a modern classic for developers who want cleaner codebases.',
            },
            {
                title: 'The Pragmatic Programmer',
                isbn: '9780135957059',
                author: 'David Thomas',
                category: 'Technology',
                publisher: 'Addison-Wesley',
                publicationYear: 2019,
                pageCount: 352,
                description:
                    'A collection of hands-on lessons for building software with good judgment, from debugging and automation to architecture and teamwork. The authors emphasize thinking in systems, communicating clearly, and iterating safely rather than chasing perfection. The advice is practical, tool-agnostic, and easy to apply day to day. Long regarded as a must-read, it remains relevant for both new developers and seasoned engineers.',
            },
            {
                title: 'Introduction to Algorithms',
                isbn: '9780262033848',
                author: 'Thomas H. Cormen',
                category: 'Technology',
                publisher: 'MIT Press',
                publicationYear: 2009,
                pageCount: 1312,
                description:
                    'Often called CLRS, this authoritative text explains fundamental algorithms and data structures with rigor and clarity. It balances proofs with intuition, making it useful for coursework, deep study, and serious interview preparation. Topics range from sorting and graphs to dynamic programming and NP-completeness. A definitive reference in computer science, it is a cornerstone for readers who want strong algorithmic foundations.',
            },
            {
                title: 'Design Patterns',
                isbn: '9780201633610',
                author: 'Erich Gamma',
                category: 'Technology',
                publisher: 'Addison-Wesley',
                publicationYear: 1994,
                pageCount: 395,
                description:
                    'The Gang of Four catalog describes recurring solutions to common object-oriented design problems, from factories and observers to composites and decorators. Each pattern comes with motivation, structure, and trade-offs, helping you choose designs intentionally rather than by habit. The book builds a shared vocabulary for discussing architecture across teams. Highly influential across languages and frameworks, it remains a foundational reference for software design.',
            },
            {
                title: "You Don't Know JS",
                isbn: '9781491904244',
                author: 'Kyle Simpson',
                category: 'Technology',
                publisher: "O'Reilly",
                publicationYear: 2015,
                pageCount: 278,
                description:
                    'Go beyond syntax to understand how JavaScript behaves under the hood, including scope, closures, types, and asynchronous execution. Kyle Simpson explains the tricky corners of the language that can surprise even experienced developers. The focus is on mental models, so you can reason confidently about real code. Praised for clarity and depth, it is ideal for developers who want true mastery rather than memorized patterns.',
            },

            // Science
            {
                title: 'A Brief History of Time',
                isbn: '9780553380163',
                author: 'Stephen Hawking',
                category: 'Science',
                publisher: 'Bantam',
                publicationYear: 1998,
                pageCount: 256,
                description:
                    'Stephen Hawking guides readers through big questions about space, time, black holes, and the origin of the universe. Complex ideas are presented with humor and a sense of wonder, connecting physics to the human desire to understand reality. The book explores how scientific theories evolve and what they imply about our place in the cosmos. A global bestseller that sparked curiosity for millions, it is a great entry point into modern cosmology.',
            },
            {
                title: 'Sapiens: A Brief History of Humankind',
                isbn: '9780062316110',
                author: 'Yuval Noah Harari',
                category: 'Science',
                publisher: 'Harper',
                publicationYear: 2015,
                pageCount: 443,
                description:
                    'Yuval Noah Harari traces the rise of Homo sapiens from early foragers to global civilization. Along the way, he challenges assumptions about money, religion, empire, and technology, asking why humans cooperate at scale. The book blends anthropology, history, and bold argumentation into a highly readable narrative. Provocative and widely discussed, this bestseller is perfect for readers who enjoy big-picture ideas.',
            },
            {
                title: 'Cosmos',
                isbn: '9780345331309',
                author: 'Carl Sagan',
                category: 'Science',
                publisher: 'Ballantine Books',
                publicationYear: 2013,
                pageCount: 365,
                description:
                    'Carl Sagan combines astronomy, history, and philosophy into an accessible tour of the universe and the scientific method. He celebrates discovery while reminding us how fragile our world is and how important skepticism can be. The book connects scientific breakthroughs to the cultures and people behind them. A beloved classic that inspired generations of scientists and dreamers, it reads like a conversation with a brilliant guide.',
            },
            {
                title: 'The Selfish Gene',
                isbn: '9780198788607',
                author: 'Richard Dawkins',
                category: 'Science',
                publisher: 'Oxford University Press',
                publicationYear: 2016,
                pageCount: 544,
                description:
                    'Richard Dawkins reframes evolution by focusing on genes as enduring units of selection, reshaping how readers think about natural selection. With vivid examples, he explores altruism, cooperation, and the logic behind behaviors that appear selfless. The book also introduces memorable concepts that became central to popular discussions of biology. Highly influential in science writing, it is challenging, thought-provoking, and rewarding.',
            },
            {
                title: 'What If?',
                isbn: '9780544272996',
                author: 'Randall Munroe',
                category: 'Science',
                publisher: 'Houghton Mifflin Harcourt',
                publicationYear: 2014,
                pageCount: 303,
                description:
                    'Randall Munroe takes absurd hypothetical questions and answers them with real physics, math, and playful curiosity. The science is serious, but the tone is light and funny, turning complex reasoning into pure entertainment. You will learn by watching ideas get stress-tested to ridiculous extremes. A fan favorite from the creator of xkcd, it is perfect for readers who like learning through laughter.',
            },

            // Non-Fiction & History
            {
                title: 'Educated',
                isbn: '9780399590504',
                author: 'Tara Westover',
                category: 'Non-Fiction',
                publisher: 'Random House',
                publicationYear: 2018,
                pageCount: 334,
                description:
                    'Tara Westover recounts growing up in a strict, isolated household and her path toward education against steep odds. Her memoir explores family loyalty, identity, and what it costs to rewrite your own life story. The narrative is both gripping and introspective, showing how knowledge can be liberating and painful at once. Critically acclaimed and a major bestseller, it is a powerful read for anyone drawn to stories of resilience.',
            },
            {
                title: 'Thinking, Fast and Slow',
                isbn: '9780374533557',
                author: 'Daniel Kahneman',
                category: 'Non-Fiction',
                publisher: 'Farrar, Straus and Giroux',
                publicationYear: 2011,
                pageCount: 499,
                description:
                    'Nobel laureate Daniel Kahneman explains two modes of thinking: fast, intuitive judgments and slow, deliberate reasoning. Through experiments and everyday examples, he shows how biases shape decisions in finance, medicine, and daily life. The book challenges readers to notice mental shortcuts and design better choices. Widely influential in psychology and business, it rewards anyone who wants sharper judgment and clearer thinking.',
            },
            {
                title: 'The Diary of a Young Girl',
                isbn: '9780553296983',
                author: 'Anne Frank',
                category: 'History',
                publisher: 'Bantam',
                publicationYear: 1993,
                pageCount: 283,
                description:
                    'Anne Frank writes with startling honesty about adolescence, hope, and fear while hiding from Nazi persecution. Her diary captures daily life under extraordinary danger, offering an intimate perspective on history that statistics cannot convey. The writing is tender, observant, and painfully human. One of the most read accounts of the Holocaust, it remains essential, heartbreaking, and enduring.',
            },
            {
                title: 'Guns, Germs, and Steel',
                isbn: '9780393317558',
                author: 'Jared Diamond',
                category: 'History',
                publisher: 'W. W. Norton',
                publicationYear: 1999,
                pageCount: 480,
                description:
                    'Jared Diamond investigates why some societies accumulated power and technology faster than others, emphasizing geography, domesticated species, and disease. The book synthesizes archaeology, biology, and history into a sweeping argument about human development. It invites debate while pushing readers to think beyond simple cultural explanations. Winner of the Pulitzer Prize, it is a provocative read for big-question thinkers.',
            },
            {
                title: 'Into the Wild',
                isbn: '9780385486804',
                author: 'Jon Krakauer',
                category: 'Non-Fiction',
                publisher: 'Anchor',
                publicationYear: 1997,
                pageCount: 207,
                description:
                    'Jon Krakauer follows the journey of Christopher McCandless, who abandoned comfort to seek meaning in the Alaskan wilderness. The narrative blends investigation with reflection as it asks what freedom, risk, and idealism can cost. It explores the pull of adventure and the consequences of going it alone. Riveting and debated for decades, it is a modern nonfiction classic for readers who like true stories with moral complexity.',
            },

            // Self-Help
            {
                title: 'Atomic Habits',
                isbn: '9780735211292',
                author: 'James Clear',
                category: 'Self-Help',
                publisher: 'Avery',
                publicationYear: 2018,
                pageCount: 320,
                description:
                    'James Clear breaks down habit change into small, repeatable systems built around cues, cravings, responses, and rewards. Instead of relying on motivation, he teaches environment design and identity-based habits that stick. The approach is practical and measurable, with tactics you can apply immediately. A blockbuster bestseller, it is ideal for readers who want consistent progress through small wins.',
            },
            {
                title: 'The Power of Now',
                isbn: '9781577314806',
                author: 'Eckhart Tolle',
                category: 'Self-Help',
                publisher: 'New World Library',
                publicationYear: 2004,
                pageCount: 229,
                description:
                    'Eckhart Tolle encourages readers to step out of rumination and anxiety by anchoring attention in the present moment. With a spiritual but accessible approach, he discusses ego, suffering, and mindful awareness in everyday life. The book aims to help you notice thought patterns and create space for calm. A long-running bestseller, it resonates with readers seeking clarity, peace, and perspective.',
            },
            {
                title: 'The 7 Habits of Highly Effective People',
                isbn: '9780743269513',
                author: 'Stephen R. Covey',
                category: 'Self-Help',
                publisher: 'Simon & Schuster',
                publicationYear: 2004,
                pageCount: 381,
                description:
                    'Stephen R. Covey offers a principle-centered framework for personal and professional effectiveness. The habits move from self-mastery to collaboration and leadership, emphasizing character and long-term thinking over quick hacks. The ideas are structured, memorable, and easy to revisit as life changes. One of the most influential business books ever, it is a foundational guide for goal-driven readers.',
            },
            {
                title: 'How to Win Friends and Influence People',
                isbn: '9780671027032',
                author: 'Dale Carnegie',
                category: 'Self-Help',
                publisher: 'Simon & Schuster',
                publicationYear: 1998,
                pageCount: 288,
                description:
                    'Dale Carnegie distills timeless communication skills: listening well, showing genuine interest, and handling conflict with tact. The advice is practical and surprisingly modern, rooted in empathy rather than manipulation. It helps readers build trust, reduce friction, and lead through respect. A perennial bestseller for good reason, it is ideal for improving relationships at work and beyond.',
            },
            {
                title: 'Deep Work',
                isbn: '9781455586691',
                author: 'Cal Newport',
                category: 'Self-Help',
                publisher: 'Grand Central Publishing',
                publicationYear: 2016,
                pageCount: 296,
                description:
                    'Cal Newport argues that focused, distraction-free concentration is a competitive advantage in modern knowledge work. He offers strategies for building routines, resisting shallow tasks, and producing higher-quality output. The book blends research with actionable methods you can test immediately. Popular with students and professionals alike, it is a strong read for anyone battling constant notifications.',
            },

            // Thriller & Mystery
            {
                title: 'The Da Vinci Code',
                isbn: '9780307474278',
                author: 'Dan Brown',
                category: 'Thriller',
                publisher: 'Anchor',
                publicationYear: 2009,
                pageCount: 480,
                description:
                    'A murder in the Louvre pulls symbologist Robert Langdon into a high-speed puzzle of codes, art history, and secret societies. The story mixes real-world landmarks with conspiratorial intrigue and relentless cliffhangers. Themes of belief, secrecy, and interpretation run beneath the chase. A worldwide blockbuster, it is ideal for readers who want a fast, twisty adventure.',
            },
            {
                title: 'Gone Girl',
                isbn: '9780307588371',
                author: 'Gillian Flynn',
                category: 'Thriller',
                publisher: 'Crown',
                publicationYear: 2012,
                pageCount: 415,
                description:
                    'When Amy Dunne vanishes, suspicion falls on her husband Nick, and the media frenzy turns their marriage into a public trial. Told through shifting perspectives, the novel explores deception, performance, and power inside intimate relationships. The tension escalates as truth becomes harder to separate from storytelling. A modern bestseller with razor-sharp twists, it is essential for psychological thriller fans.',
            },
            {
                title: 'The Girl with the Dragon Tattoo',
                isbn: '9780307949486',
                author: 'Stieg Larsson',
                category: 'Thriller',
                publisher: 'Vintage',
                publicationYear: 2011,
                pageCount: 644,
                description:
                    'Journalist Mikael Blomkvist teams up with hacker Lisbeth Salander to investigate a decades-old disappearance tied to a powerful family. The mystery unfolds into a darker story of corruption and violence, anchored by two unforgettable leads. It blends investigative detail with high-stakes suspense and social critique. Internationally acclaimed and hugely popular, it is a gripping entry in modern crime fiction.',
            },
            {
                title: 'The Silent Patient',
                isbn: '9781250301697',
                author: 'Alex Michaelides',
                category: 'Thriller',
                publisher: 'Celadon Books',
                publicationYear: 2019,
                pageCount: 336,
                description:
                    'Alicia Berenson shoots her husband and then refuses to speak, leaving her motives locked behind silence. A psychotherapist becomes obsessed with unraveling what happened, and the investigation turns increasingly personal. The book explores trauma, obsession, and the stories people tell to survive. A breakout bestseller known for its twist, it delivers tight, page-turning suspense.',
            },
            {
                title: 'And Then There Were None',
                isbn: '9780062073488',
                author: 'Agatha Christie',
                category: 'Thriller',
                publisher: 'William Morrow',
                publicationYear: 2011,
                pageCount: 264,
                description:
                    'Ten strangers are invited to an isolated island, where a recorded accusation reveals each has a hidden past. As guests begin to die one by one, paranoia and guilt take over and trust collapses. The novel explores justice, fear, and the inevitability of consequences. Often cited among the best-selling mysteries ever, it is a masterclass in airtight plotting.',
            },

            // Romance
            {
                title: 'The Notebook',
                isbn: '9780446605236',
                author: 'Nicholas Sparks',
                category: 'Romance',
                publisher: 'Warner Books',
                publicationYear: 1996,
                pageCount: 214,
                description:
                    'Noah Calhoun reflects on a summer romance with Allie Nelson that never fully left him. Their story explores devotion, memory, and the choices that shape a life over time. The tone is tender and emotionally direct, built for readers who want a heartfelt tearjerker. Widely loved and adapted for film, it remains a modern romance favorite.',
            },
            {
                title: 'Me Before You',
                isbn: '9780143124542',
                author: 'Jojo Moyes',
                category: 'Romance',
                publisher: 'Penguin Books',
                publicationYear: 2012,
                pageCount: 400,
                description:
                    'Louisa Clark takes a job caring for Will Traynor, a man whose life changed after a devastating accident. Their relationship challenges assumptions about independence, dignity, and what it means to live fully. The book blends humor and charm with hard emotional questions, keeping stakes personal and real. A hugely popular bestseller, it is ideal for readers who like romance with depth.',
            },
            {
                title: 'Outlander',
                isbn: '9780440212560',
                author: 'Diana Gabaldon',
                category: 'Romance',
                publisher: 'Dell',
                publicationYear: 1991,
                pageCount: 850,
                description:
                    'After being transported from 1940s Scotland to the eighteenth century, Claire Randall must survive political danger and a new kind of love. The novel blends romance with rich historical detail, adventure, and time-travel intrigue. Themes of identity, loyalty, and survival run through every chapter. A beloved start to a long-running series, it is perfect for readers who want epic scope.',
            },
            {
                title: 'The Hating Game',
                isbn: '9780062439604',
                author: 'Sally Thorne',
                category: 'Romance',
                publisher: 'William Morrow',
                publicationYear: 2016,
                pageCount: 384,
                description:
                    'Lucy and Joshua share an office and a rivalry that turns into a game of one-upmanship, until attraction complicates everything. With sharp banter and slow-building tension, the story explores ambition, vulnerability, and workplace dynamics. The romance is playful but emotionally satisfying, with strong chemistry and humor. A standout modern rom-com, it is fast, fun, and addictive.',
            },
            {
                title: 'It Ends with Us',
                isbn: '9781501110368',
                author: 'Colleen Hoover',
                category: 'Romance',
                publisher: 'Atria Books',
                publicationYear: 2016,
                pageCount: 384,
                description:
                    'Lily Bloom begins a relationship that forces her to confront painful patterns and difficult choices. The story mixes romance with a serious look at cycles of harm, resilience, and self-worth. It is emotionally intense and grounded in realistic stakes rather than fantasy. A major bestseller that sparked wide conversation, it is challenging, moving, and ultimately hopeful.',
            },

            // Biography
            {
                title: 'Steve Jobs',
                isbn: '9781451648539',
                author: 'Walter Isaacson',
                category: 'Biography',
                publisher: 'Simon & Schuster',
                publicationYear: 2011,
                pageCount: 656,
                description:
                    'Walter Isaacson draws on extensive interviews to portray Steve Jobs as visionary, perfectionist, and complicated human being. The book follows the rise of Apple, the creation of iconic products, and the personality clashes that shaped them. It explores creativity, leadership, and the costs of uncompromising standards. Widely read in business and tech, it is a compelling look at innovation in action.',
            },
            {
                title: 'Becoming',
                isbn: '9781524763138',
                author: 'Michelle Obama',
                category: 'Biography',
                publisher: 'Crown',
                publicationYear: 2018,
                pageCount: 448,
                description:
                    'Michelle Obama tells the story of her life from Chicago childhood to public service and the White House. She writes about identity, family, and the pressures of visibility with warmth and honesty. The memoir balances personal growth with the realities of public leadership. A record-setting bestseller, it is inspiring for readers interested in resilience and purpose.',
            },
            {
                title: 'Elon Musk',
                isbn: '9780062301239',
                author: 'Ashlee Vance',
                category: 'Biography',
                publisher: 'Ecco',
                publicationYear: 2015,
                pageCount: 400,
                description:
                    'Ashlee Vance chronicles Elon Musks path from early entrepreneurship to building companies in electric vehicles, spaceflight, and energy. The biography highlights ambition, risk tolerance, and the intense cultures around high-stakes innovation. It also examines how personality and mission can drive both breakthroughs and conflict. Widely discussed in tech circles, it is a fascinating study of modern Silicon Valley drive.',
            },
            {
                title: 'Born a Crime',
                isbn: '9780399588174',
                author: 'Trevor Noah',
                category: 'Biography',
                publisher: 'Spiegel & Grau',
                publicationYear: 2016,
                pageCount: 304,
                description:
                    'Trevor Noah recounts growing up in apartheid and post-apartheid South Africa as the child of a mixed-race relationship that was illegal at the time. His stories blend humor with sharp insight into politics, poverty, and family, making heavy history feel immediate and personal. The memoir explores identity, belonging, and the power of laughter as survival. A celebrated bestseller, it is both hilarious and deeply human.',
            },
            {
                title: 'Long Walk to Freedom',
                isbn: '9780316548182',
                author: 'Nelson Mandela',
                category: 'Biography',
                publisher: 'Little, Brown and Company',
                publicationYear: 1995,
                pageCount: 656,
                description:
                    'Nelson Mandela narrates his journey from rural childhood to anti-apartheid leadership, imprisonment, and eventual presidency. The memoir explores sacrifice, endurance, and the long arc of justice through decades of struggle. It offers a firsthand view of political organizing, moral conviction, and reconciliation. A cornerstone of modern political autobiography, it is essential for readers who want history through lived experience.',
            },

            // Children
            {
                title: "Harry Potter and the Sorcerer's Stone",
                isbn: '9780590353427',
                author: 'J.K. Rowling',
                category: 'Children',
                publisher: 'Scholastic',
                publicationYear: 1998,
                pageCount: 309,
                description:
                    'Harry discovers he is a wizard and enters a hidden world of magic, friendship, and danger at Hogwarts. As mysteries unfold, the story balances wonder and humor with darker hints of a looming threat. Themes of belonging, courage, and chosen family make it emotionally resonant for all ages. A global phenomenon that launched a generation of readers, it is a perfect gateway to fantasy.',
            },
            {
                title: "Charlotte's Web",
                isbn: '9780061124952',
                author: 'E.B. White',
                category: 'Children',
                publisher: 'HarperCollins',
                publicationYear: 2006,
                pageCount: 192,
                description:
                    'Wilbur the pig faces an uncertain future until Charlotte the spider devises a brave plan to save him. Their friendship celebrates kindness, loyalty, and the bittersweet nature of growing up. The book is gentle but honest about life and loss, making it powerful for kids and adults alike. A classic of childrens literature, it remains one of the most heartfelt stories for shared reading.',
            },
            {
                title: 'The Hobbit',
                isbn: '9780547928227',
                author: 'J.R.R. Tolkien',
                category: 'Children',
                publisher: 'Houghton Mifflin Harcourt',
                publicationYear: 2012,
                pageCount: 300,
                description:
                    'Bilbo Baggins is swept from a quiet life into an adventure with dwarves seeking to reclaim their mountain home. Along the way he meets trolls, elves, and the mysterious creature Gollum, discovering courage he did not know he had. The story explores bravery, greed, and the joy of the unexpected journey. A timeless fantasy classic, it is an ideal starting point for Tolkien.',
            },
            {
                title: 'Matilda',
                isbn: '9780142410370',
                author: 'Roald Dahl',
                category: 'Children',
                publisher: 'Puffin Books',
                publicationYear: 2007,
                pageCount: 240,
                description:
                    'Brilliant young Matilda finds refuge in books while navigating neglectful parents and a frightening headmistress. With cleverness and unexpected powers, she learns to stand up for herself and protect the people she cares about. The story mixes comedy with justice, celebrating intelligence and kindness. Funny, sharp, and empowering, this Roald Dahl favorite is a classic for confident young readers.',
            },
            {
                title: 'Where the Wild Things Are',
                isbn: '9780060254926',
                author: 'Maurice Sendak',
                category: 'Children',
                publisher: 'HarperCollins',
                publicationYear: 1963,
                pageCount: 48,
                description:
                    'After a tantrum, Max sails to a land of wild creatures and becomes their king, only to feel the pull of home. In a few vivid pages, the book captures big emotions: anger, imagination, and the comfort of being loved. It speaks to children with honesty, without talking down to them. Winner of the Caldecott Medal, it is a timeless picture-book classic.',
            },
        ];

        const allProducts = [];

        // Process real books (fetch covers concurrently)
        console.log(`   Processing ${realBooksList.length} real books...`);

        // Fetch all covers concurrently using Promise.all
        const bookProcessingPromises = realBooksList.map(async (book) => {
            let cover = { source: 'placeholder', url: null };
            try {
                console.log(`   Fetching cover for: ${book.title}`);
                const url = await getBookCover({
                    isbn: book.isbn,
                    title: book.title,
                    author: book.author,
                });

                if (url) {
                    cover = { source: 'api', url: url };
                }
            } catch (e) {
                console.log(
                    `   Failed to fetch cover for ${book.title}:`,
                    e.message
                );
            }

            return {
                ...book,
                price: parseFloat(faker.commerce.price({ min: 10, max: 60 })),
                stock: faker.number.int({ min: 5, max: 100 }),
                rating: faker.number.float({
                    min: 3.5,
                    max: 5,
                    precision: 0.1,
                }),
                numReviews: faker.number.int({ min: 10, max: 1000 }),
                featured: faker.datatype.boolean(),
                language: 'English',
                isActive: true,
                coverImage: cover,
                images: [], // Legacy field
                createdAt: faker.date.past(),
                updatedAt: new Date(),
            };
        });

        // Wait for all books to be processed
        const processedBooks = await Promise.all(bookProcessingPromises);
        allProducts.push(...processedBooks);

        const insertedProducts = await db
            .collection('products')
            .insertMany(allProducts);
        const productIdList = Object.values(insertedProducts.insertedIds);
        console.log(`✅ Created ${insertedProducts.insertedCount} products\n`);

        // ---------------------------------------------------------
        // 4. Seed Carts
        // ---------------------------------------------------------
        console.log('🛒 Creating carts...');
        const cartsToSeed = [];
        const customers = userIdList.slice(1);

        // Create carts for first 20 customers
        for (let i = 0; i < 20 && i < customers.length; i++) {
            const cartItems = [];
            const numItems = faker.number.int({ min: 1, max: 5 });

            for (let j = 0; j < numItems; j++) {
                const pIndex = faker.number.int({
                    min: 0,
                    max: allProducts.length - 1,
                });
                const pId = productIdList[pIndex];
                const pData = allProducts[pIndex];

                cartItems.push({
                    product: pId,
                    quantity: faker.number.int({ min: 1, max: 3 }),
                    price: pData.price,
                });
            }

            cartsToSeed.push({
                user: customers[i],
                items: cartItems,
                totalPrice: cartItems.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                ),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        if (cartsToSeed.length > 0) {
            await db.collection('carts').insertMany(cartsToSeed);
        }
        console.log(`✅ Created ${cartsToSeed.length} carts\n`);

        // ---------------------------------------------------------
        // 5. Seed Orders
        // ---------------------------------------------------------
        console.log('📦 Creating orders...');
        const ordersToSeed = [];

        for (let i = 0; i < 25; i++) {
            const userIndex = faker.number.int({
                min: 1,
                max: customers.length - 1,
            });
            const userId = userIdList[userIndex];

            const orderItems = [];
            const numItems = faker.number.int({ min: 1, max: 4 });

            for (let j = 0; j < numItems; j++) {
                const pIndex = faker.number.int({
                    min: 0,
                    max: allProducts.length - 1,
                });
                const pId = productIdList[pIndex];
                const pData = allProducts[pIndex];

                orderItems.push({
                    productId: pId,
                    title: pData.title,
                    isbn: pData.isbn,
                    quantity: faker.number.int({ min: 1, max: 2 }),
                    price: pData.price,
                });
            }

            const totalAmount = orderItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );
            const timestamp = Date.now().toString().slice(-8);
            const random = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, '0');

            ordersToSeed.push({
                orderNumber: `ORD-${timestamp}-${random}-${i}`,
                userId: userId,
                items: orderItems,
                shippingAddress: {
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    street: faker.location.streetAddress(),
                    city: faker.location.city(),
                    state: faker.location.state(),
                    zipCode: faker.location.zipCode(),
                    country: faker.location.country(),
                    phoneNumber: faker.phone.number(),
                },
                paymentStatus: faker.helpers.arrayElement([
                    'completed',
                    'pending',
                ]),
                orderStatus: faker.helpers.arrayElement([
                    'processing',
                    'shipped',
                    'delivered',
                    'pending',
                ]),
                total: parseFloat((totalAmount * 1.1 + 5.0).toFixed(2)), // + Tax & Ship
                createdAt: faker.date.past(),
                updatedAt: new Date(),
            });
        }

        await db.collection('orders').insertMany(ordersToSeed);
        console.log(`✅ Created ${ordersToSeed.length} orders\n`);

        // ---------------------------------------------------------
        // Summary
        // ---------------------------------------------------------
        console.log('📊 Database Summary:');
        console.log(
            `   Users: ${await db.collection('users').countDocuments()}`
        );
        console.log(
            `   Categories: ${await db
                .collection('categories')
                .countDocuments()}`
        );
        console.log(
            `   Products: ${await db.collection('products').countDocuments()}`
        );
        console.log(
            `   Carts: ${await db.collection('carts').countDocuments()}`
        );
        console.log(
            `   Orders: ${await db.collection('orders').countDocuments()}`
        );

        console.log('\n🎉 Database seeded successfully!\n');
        console.log('🔑 Admin: admin@bookstore.com / admin123');
        console.log('🔑 User:  john@test.com / password123\n');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await closeDB();
    }
}

seedData();
