require('dotenv').config();
const { connectDB, closeDB } = require('../config/database');
const bcrypt = require('bcrypt');
const { getBookCover } = require('../utils/bookcoverHelper');
const { faker } = require('@faker-js/faker');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
    if (!error) return false;
    const labels = error.errorLabelSet;
    if (labels && typeof labels.has === 'function') {
        if (labels.has('RetryableWriteError') || labels.has('ResetPool')) {
            return true;
        }
    }
    if (error.code === 'ECONNRESET') return true;
    if (typeof error.message === 'string' && error.message.includes('ECONNRESET')) {
        return true;
    }
    return false;
};

async function seedData() {
    try {
        let db = await connectDB();

        const runWithRetry = async (operation, label, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
                try {
                    return await operation();
                } catch (error) {
                    const retryable = isRetryableError(error);
                    if (!retryable || attempt > maxRetries) {
                        throw error;
                    }
                    console.log(
                        `🔁 Retry ${label} (attempt ${attempt + 1}/${maxRetries + 1}) due to network reset...`
                    );
                    await closeDB();
                    await sleep(1000 * attempt);
                    db = await connectDB();
                }
            }
            return null;
        };

        const insertProductsInBatches = async (products, batchSize = 200) => {
            let insertedCount = 0;
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                const result = await runWithRetry(
                    () => db.collection('products').insertMany(batch),
                    `create products batch ${Math.floor(i / batchSize) + 1}`
                );
                insertedCount += result.insertedCount || 0;
            }
            return insertedCount;
        };

        console.log('🌱 Seeding database...\n');

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await db.collection('users').deleteMany({});
        await db.collection('categories').deleteMany({});
        await db.collection('products').deleteMany({});
        await db.collection('carts').deleteMany({});
        await db.collection('orders').deleteMany({});
        await db.collection('reviews').deleteMany({});
        await db.collection('coupons').deleteMany({});
        await db.collection('couponredemptions').deleteMany({});
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

        const categories = await runWithRetry(
            () =>
                db.collection('categories').insertMany(
                    categoryList.map((c) => ({
                        ...c,
                        parentCategory: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }))
                ),
            'create categories'
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

        const insertedUsers = await runWithRetry(
            () => db.collection('users').insertMany(usersToSeed),
            'create users'
        );
        const userIdList = Object.values(insertedUsers.insertedIds);
        console.log(`✅ Created ${insertedUsers.insertedCount} users\n`);

        // ---------------------------------------------------------
        // 2.4 Seed Coupons
        // ---------------------------------------------------------
        console.log('🎫 Creating coupons...');

        const now = new Date();
        const couponsToSeed = [
            {
                code: 'WELCOME10',
                name: 'Welcome 10% Off',
                description: '10% off your first order (max $20, min $30)',
                type: 'percent',
                value: 10,
                maxDiscountAmount: 20,
                minSubtotal: 30,
                isActive: true,
                startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                endsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                usageLimitTotal: 10000,
                usageLimitPerUser: 1,
                createdAt: now,
                updatedAt: now
            },
            {
                code: 'FIVEOFF',
                name: '$5 Off',
                description: '$5 off orders over $25',
                type: 'fixed',
                value: 5,
                minSubtotal: 25,
                isActive: true,
                startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                endsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                usageLimitTotal: 10000,
                usageLimitPerUser: 5,
                createdAt: now,
                updatedAt: now
            },
            {
                code: 'SHIPFREE',
                name: 'Free Shipping',
                description: 'Placeholder: shipping is already FREE in UI',
                type: 'fixed',
                value: 0,
                isActive: false,
                createdAt: now,
                updatedAt: now
            }
        ];

        const adminUserId = insertedUsers.insertedIds[0] || userIdList[0];
        const couponsWithAudit = couponsToSeed.map((c) => ({
            ...c,
            createdBy: adminUserId,
            updatedBy: adminUserId
        }));

        await runWithRetry(
            () => db.collection('coupons').insertMany(couponsWithAudit),
            'create coupons'
        );
        console.log(`✅ Created ${couponsWithAudit.length} coupons\n`);

        // ---------------------------------------------------------
        // 3. Seed Real Products
        // ---------------------------------------------------------
        console.log('📖 Seeding real books and fetching covers...');

        const EN_FILLERS = [
            'Readers can expect a steady rhythm of scene, reflection, and memorable dialogue that keeps the themes clear without reducing the characters to symbols.',
            'Across chapters, the narration balances tension and tenderness, showing how choices accumulate and reshape the protagonist’s sense of self.',
            'Background details about place, work, and relationships enrich the plot and give the story a lived-in texture.',
            'The prose favors clarity and momentum, making complex ideas approachable while preserving emotional nuance.',
            'By the final pages, the book rewards patience with a resonant conclusion that invites rereading and discussion.',
            'Each section adds a new facet, whether through a revealing conversation, a quiet observation, or a turning point that changes the stakes.',
            'It is a book that works on multiple levels: as entertainment, as a study of character, and as a lens on its era.',
            'Readers who enjoy thoughtful pacing and strong thematic cohesion will find plenty to appreciate.'
        ];

        const VI_FILLERS = [
            'Nhịp kể cân bằng giữa kịch tính và suy tư, khiến câu chuyện vừa dễ theo dõi vừa đọng lại nhiều lớp nghĩa.',
            'Bối cảnh, nghề nghiệp và các mối quan hệ được khắc họa cụ thể, tạo cảm giác đời sống thật và giàu chiều sâu.',
            'Giọng văn rõ ràng, mạch lạc, giúp ý tưởng phức tạp trở nên gần gũi mà vẫn giữ được sắc thái cảm xúc.',
            'Mỗi chương bổ sung một góc nhìn mới qua đối thoại, quan sát tinh tế hoặc bước ngoặt làm thay đổi thế cân bằng.',
            'Khi khép lại, tác phẩm để lại dư âm, khuyến khích người đọc suy ngẫm và nhìn lại các chi tiết then chốt.',
            'Cuốn sách vừa mang tính giải trí, vừa là nghiên cứu nhân vật, đồng thời phản chiếu tinh thần của thời đại.',
            'Sự tiết chế, nhịp điệu và chủ đề thống nhất khiến trải nghiệm đọc trở nên mạch lạc và thuyết phục.',
            'Những điểm nhấn về lựa chọn, hệ quả và trách nhiệm cá nhân được nhắc lại một cách tự nhiên.'
        ];

        const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

        const expandToWordCount = (seed, fillers, target = 200) => {
            let text = (seed || '').trim();
            if (!text.endsWith('.')) text = `${text}.`;
            let words = countWords(text);
            let i = 0;

            while (words < target) {
                text = `${text} ${fillers[i % fillers.length]}`;
                words = countWords(text);
                i += 1;
            }

            return text;
        };

        const makeDescriptionI18n = (enSeed, viSeed) => ({
            en: expandToWordCount(enSeed, EN_FILLERS, 200),
            vi: expandToWordCount(viSeed, VI_FILLERS, 200)
        });

        const realBooksList = [
            // Fiction
            {
                titleI18n: {
                    en: 'The Great Gatsby',
                    vi: 'Gatsby Vĩ Đại'
                },
                isbn: '9780743273565',
                author: 'F. Scott Fitzgerald',
                category: 'Fiction',
                publisher: 'Scribner',
                publicationYear: 2004,
                pageCount: 180,
                descriptionI18n: makeDescriptionI18n(
                    'Nick Carraway is pulled into the glittering orbit of Jay Gatsby, a man who throws lavish parties to hide a single-minded longing. Set in the Jazz Age, the novel peels back the shine to reveal obsession, status, and quiet heartbreak. It is a sharp portrait of wealth and reinvention, and a haunting critique of the American Dream. Frequently taught and endlessly quoted, it remains one of the defining American classics.',
                    'Nick Carraway bị cuốn vào thế giới hào nhoáng của Jay Gatsby, nơi những bữa tiệc xa hoa che giấu một nỗi khao khát đơn độc. Bối cảnh thời Jazz phơi bày ám ảnh về địa vị, giàu sang và sự vỡ mộng của Giấc mơ Mỹ.'
                )
            },
            {
                titleI18n: {
                    en: 'To Kill a Mockingbird',
                    vi: 'Giết Con Chim Nhại'
                },
                isbn: '9780061120084',
                author: 'Harper Lee',
                category: 'Fiction',
                publisher: 'Harper Perennial',
                publicationYear: 2006,
                pageCount: 324,
                descriptionI18n: makeDescriptionI18n(
                    'In 1930s Alabama, Scout Finch watches her father, lawyer Atticus Finch, defend a Black man falsely accused of a terrible crime. Through a child’s perspective, the story blends humor and warmth with a clear-eyed view of injustice and moral courage. The novel explores empathy, integrity, and the costs of doing the right thing in a divided community. Winner of the Pulitzer Prize, it is both a moving coming-of-age story and a timeless staple.',
                    'Ở Alabama thập niên 1930, cô bé Scout chứng kiến cha mình, luật sư Atticus Finch, bào chữa cho một người da màu bị buộc tội oan. Câu chuyện về công lý, lòng trắc ẩn và dũng khí đạo đức được kể bằng góc nhìn trẻ thơ vừa ấm áp vừa sắc sảo.'
                )
            },
            {
                titleI18n: {
                    en: '1984',
                    vi: '1984'
                },
                isbn: '9780451524935',
                author: 'George Orwell',
                category: 'Fiction',
                publisher: 'Signet Classic',
                publicationYear: 1961,
                pageCount: 328,
                descriptionI18n: makeDescriptionI18n(
                    'Winston Smith lives under constant surveillance in Oceania, where the Party controls information, memory, and even language. As he searches for truth and intimacy, every choice becomes dangerous, and rebellion turns into a psychological battle. The novel examines propaganda, power, and how reality can be engineered. Tense and unsettling, this classic shaped modern dystopian fiction and our vocabulary for authoritarian control.',
                    'Winston Smith sống trong một xã hội bị giám sát toàn diện, nơi quyền lực kiểm soát thông tin và cả ký ức. Khi anh tìm kiếm sự thật và sự thân mật, mọi lựa chọn đều trở nên nguy hiểm, phơi bày bản chất của tuyên truyền và sự thao túng thực tại.'
                )
            },
            {
                titleI18n: {
                    en: 'Pride and Prejudice',
                    vi: 'Kiêu Hãnh và Định Kiến'
                },
                isbn: '9780141439518',
                author: 'Jane Austen',
                category: 'Fiction',
                publisher: 'Penguin Classics',
                publicationYear: 2002,
                pageCount: 480,
                descriptionI18n: makeDescriptionI18n(
                    'Elizabeth Bennet navigates family pressures and social expectations while sparring with the proud, complicated Mr. Darcy. Austen mixes romance with razor-sharp social satire, exposing how class, reputation, and first impressions distort judgment. The story rewards readers with wit, warmth, and one of literature’s most satisfying slow-burn arcs. Beloved for its dialogue and insight, it remains a landmark of English literature.',
                    'Elizabeth Bennet đối mặt áp lực gia đình và chuẩn mực xã hội, đồng thời không ngừng “đấu khẩu” với một quý ông kiêu hãnh. Tác phẩm pha trộn lãng mạn và châm biếm xã hội, xoáy sâu vào định kiến, danh tiếng và những ấn tượng ban đầu dễ đánh lừa.'
                )
            },
            {
                titleI18n: {
                    en: 'The Catcher in the Rye',
                    vi: 'Bắt Trẻ Đồng Xanh'
                },
                isbn: '9780316769488',
                author: 'J.D. Salinger',
                category: 'Fiction',
                publisher: 'Little, Brown and Company',
                publicationYear: 1991,
                pageCount: 277,
                descriptionI18n: makeDescriptionI18n(
                    'After leaving prep school, Holden Caulfield wanders New York City for a few restless days, masking grief and fear with sarcasm and bravado. His voice captures the loneliness of adolescence and the anxiety of stepping into adulthood. The novel explores alienation, innocence, and the longing for authenticity in a world that feels false. Iconic and often debated, it remains a defining work of twentieth-century American fiction.',
                    'Holden Caulfield lang thang ở New York sau khi rời trường, dùng mỉa mai để che giấu nỗi buồn và sự hoang mang tuổi mới lớn. Giọng kể cô độc và bất an tạo nên một bức chân dung ám ảnh về sự xa lạ và khát khao chân thật.'
                )
            },

            // Technology
            {
                titleI18n: {
                    en: 'Clean Code',
                    vi: 'Code Sạch'
                },
                isbn: '9780132350884',
                author: 'Robert C. Martin',
                category: 'Technology',
                publisher: 'Prentice Hall',
                publicationYear: 2008,
                pageCount: 464,
                descriptionI18n: makeDescriptionI18n(
                    'Robert C. Martin argues that readability is a feature, not a luxury, and shows how small decisions compound into maintainable systems. You will learn practical habits around naming, functions, testing, refactoring, and design boundaries that keep complexity under control. The book emphasizes craft: writing code that teammates can understand, change, and trust. Widely recommended in professional teams, it is a modern classic for developers who want cleaner codebases.',
                    'Cuốn sách nhấn mạnh “tính dễ đọc” là một tính năng của phần mềm. Từ đặt tên, viết hàm, kiểm thử đến refactor, tác giả hướng dẫn những thói quen nhỏ giúp code dễ bảo trì, ít lỗi và dễ cộng tác trong đội nhóm.'
                )
            },
            {
                titleI18n: {
                    en: 'The Pragmatic Programmer',
                    vi: 'Lập Trình Viên Thực Dụng'
                },
                isbn: '9780135957059',
                author: 'David Thomas',
                category: 'Technology',
                publisher: 'Addison-Wesley',
                publicationYear: 2019,
                pageCount: 352,
                descriptionI18n: makeDescriptionI18n(
                    'A collection of hands-on lessons for building software with good judgment, from debugging and automation to architecture and teamwork. The authors emphasize thinking in systems, communicating clearly, and iterating safely rather than chasing perfection. The advice is practical, tool-agnostic, and easy to apply day to day. Long regarded as a must-read, it remains relevant for both new developers and seasoned engineers.',
                    'Tập hợp bài học thực hành về cách làm phần mềm với tư duy đúng: tự động hóa, gỡ lỗi, thiết kế, kiến trúc và làm việc nhóm. Lời khuyên mang tính nguyên tắc, ít phụ thuộc công cụ và rất dễ áp dụng vào công việc hằng ngày.'
                )
            },
            {
                titleI18n: {
                    en: 'Introduction to Algorithms',
                    vi: 'Giới Thiệu Về Thuật Toán'
                },
                isbn: '9780262033848',
                author: 'Thomas H. Cormen',
                category: 'Technology',
                publisher: 'MIT Press',
                publicationYear: 2009,
                pageCount: 1312,
                descriptionI18n: makeDescriptionI18n(
                    'Often called CLRS, this authoritative text explains fundamental algorithms and data structures with rigor and clarity. It balances proofs with intuition, making it useful for coursework, deep study, and serious interview preparation. Topics range from sorting and graphs to dynamic programming and NP-completeness. A definitive reference in computer science, it is a cornerstone for readers who want strong algorithmic foundations.',
                    'Giáo trình kinh điển về thuật toán và cấu trúc dữ liệu, cân bằng giữa lập luận chặt chẽ và trực giác. Từ sắp xếp, đồ thị đến quy hoạch động và NP-đầy đủ, đây là tài liệu nền tảng cho học tập lẫn ôn phỏng vấn nghiêm túc.'
                )
            },
            {
                titleI18n: {
                    en: 'Design Patterns',
                    vi: 'Mẫu Thiết Kế'
                },
                isbn: '9780201633610',
                author: 'Erich Gamma',
                category: 'Technology',
                publisher: 'Addison-Wesley',
                publicationYear: 1994,
                pageCount: 395,
                descriptionI18n: makeDescriptionI18n(
                    'The Gang of Four catalog describes recurring solutions to common object-oriented design problems, from factories and observers to composites and decorators. Each pattern comes with motivation, structure, and trade-offs, helping you choose designs intentionally rather than by habit. The book builds a shared vocabulary for discussing architecture across teams. Highly influential across languages and frameworks, it remains a foundational reference for software design.',
                    'Bộ “mẫu thiết kế” của Gang of Four tổng hợp các giải pháp lặp lại cho bài toán thiết kế hướng đối tượng. Mỗi pattern được trình bày kèm động cơ, cấu trúc và đánh đổi, giúp bạn lựa chọn thiết kế có chủ đích và có chung ngôn ngữ với đồng đội.'
                )
            },
            {
                titleI18n: {
                    en: "You Don't Know JS",
                    vi: 'Bạn Chưa Biết JS'
                },
                isbn: '9781491904244',
                author: 'Kyle Simpson',
                category: 'Technology',
                publisher: "O'Reilly",
                publicationYear: 2015,
                pageCount: 278,
                descriptionI18n: makeDescriptionI18n(
                    'Go beyond syntax to understand how JavaScript behaves under the hood, including scope, closures, types, and asynchronous execution. Kyle Simpson explains the tricky corners of the language that can surprise even experienced developers. The focus is on mental models, so you can reason confidently about real code. Praised for clarity and depth, it is ideal for developers who want true mastery rather than memorized patterns.',
                    'Đi sâu vào cách JavaScript vận hành: phạm vi, closure, kiểu dữ liệu và bất đồng bộ. Tác giả tập trung xây dựng mô hình tư duy để bạn hiểu đúng những góc “khó chịu” của ngôn ngữ và tự tin suy luận về code thực tế.'
                )
            },

            // Science
            {
                titleI18n: {
                    en: 'A Brief History of Time',
                    vi: 'Lược Sử Thời Gian'
                },
                isbn: '9780553380163',
                author: 'Stephen Hawking',
                category: 'Science',
                publisher: 'Bantam',
                publicationYear: 1998,
                pageCount: 256,
                descriptionI18n: makeDescriptionI18n(
                    'Stephen Hawking guides readers through big questions about space, time, black holes, and the origin of the universe. Complex ideas are presented with humor and a sense of wonder, connecting physics to the human desire to understand reality. The book explores how scientific theories evolve and what they imply about our place in the cosmos. A global bestseller that sparked curiosity for millions, it is a great entry point into modern cosmology.',
                    'Stephen Hawking dẫn dắt qua những câu hỏi lớn về không-thời gian, hố đen và nguồn gốc vũ trụ. Các ý tưởng phức tạp được trình bày dễ tiếp cận, khơi gợi tò mò về cách khoa học thay đổi hiểu biết của chúng ta về vũ trụ.'
                )
            },
            {
                titleI18n: {
                    en: 'Sapiens: A Brief History of Humankind',
                    vi: 'Sapiens: Lược Sử Loài Người'
                },
                isbn: '9780062316110',
                author: 'Yuval Noah Harari',
                category: 'Science',
                publisher: 'Harper',
                publicationYear: 2015,
                pageCount: 443,
                descriptionI18n: makeDescriptionI18n(
                    'Yuval Noah Harari traces the rise of Homo sapiens from early foragers to global civilization. Along the way, he challenges assumptions about money, religion, empire, and technology, asking why humans cooperate at scale. The book blends anthropology, history, and bold argumentation into a highly readable narrative. Provocative and widely discussed, this bestseller is perfect for readers who enjoy big-picture ideas.',
                    'Tác phẩm kể hành trình của loài người từ những nhóm săn bắt-hái lượm đến xã hội toàn cầu. Tác giả đặt câu hỏi về tiền tệ, tôn giáo, đế chế và công nghệ, giải thích vì sao con người có thể hợp tác ở quy mô lớn.'
                )
            },
            {
                titleI18n: {
                    en: 'Cosmos',
                    vi: 'Vũ Trụ'
                },
                isbn: '9780345331309',
                author: 'Carl Sagan',
                category: 'Science',
                publisher: 'Ballantine Books',
                publicationYear: 2013,
                pageCount: 365,
                descriptionI18n: makeDescriptionI18n(
                    'Carl Sagan combines astronomy, history, and philosophy into an accessible tour of the universe and the scientific method. He celebrates discovery while reminding us how fragile our world is and how important skepticism can be. The book connects scientific breakthroughs to the cultures and people behind them. A beloved classic that inspired generations of scientists and dreamers, it reads like a conversation with a brilliant guide.',
                    'Carl Sagan đưa bạn du hành qua thiên văn học, lịch sử và triết học để hiểu phương pháp khoa học. Giọng văn giàu cảm hứng kết nối các khám phá với con người và văn hóa phía sau chúng, vừa lãng mạn vừa tỉnh táo.'
                )
            },
            {
                titleI18n: {
                    en: 'The Selfish Gene',
                    vi: 'Gen Vị Kỷ'
                },
                isbn: '9780198788607',
                author: 'Richard Dawkins',
                category: 'Science',
                publisher: 'Oxford University Press',
                publicationYear: 2016,
                pageCount: 544,
                descriptionI18n: makeDescriptionI18n(
                    'Richard Dawkins reframes evolution by focusing on genes as enduring units of selection, reshaping how readers think about natural selection. With vivid examples, he explores altruism, cooperation, and the logic behind behaviors that appear selfless. The book also introduces memorable concepts that became central to popular discussions of biology. Highly influential in science writing, it is challenging, thought-provoking, and rewarding.',
                    'Richard Dawkins nhìn tiến hóa từ góc độ gen như “đơn vị” bền bỉ của chọn lọc tự nhiên. Qua nhiều ví dụ sinh động, ông giải thích hợp tác, vị tha và các hành vi tưởng như mâu thuẫn, mở ra cách nghĩ mới về sinh học.'
                )
            },
            {
                titleI18n: {
                    en: 'What If?',
                    vi: 'Điều Gì Xảy Ra Nếu?'
                },
                isbn: '9780544272996',
                author: 'Randall Munroe',
                category: 'Science',
                publisher: 'Houghton Mifflin Harcourt',
                publicationYear: 2014,
                pageCount: 303,
                descriptionI18n: makeDescriptionI18n(
                    'Randall Munroe takes absurd hypothetical questions and answers them with real physics, math, and playful curiosity. The science is serious, but the tone is light and funny, turning complex reasoning into pure entertainment. You will learn by watching ideas get stress-tested to ridiculous extremes. A fan favorite from the creator of xkcd, it is perfect for readers who like learning through laughter.',
                    'Những câu hỏi giả định “khó đỡ” được trả lời bằng vật lý và toán học nghiêm túc nhưng đầy hài hước. Bạn học được cách tư duy khoa học bằng việc kéo các ý tưởng đến cực hạn một cách vui nhộn và dễ hiểu.'
                )
            },

            // Non-Fiction & History
            {
                titleI18n: {
                    en: 'Educated',
                    vi: 'Được Giáo Dục'
                },
                isbn: '9780399590504',
                author: 'Tara Westover',
                category: 'Non-Fiction',
                publisher: 'Random House',
                publicationYear: 2018,
                pageCount: 334,
                descriptionI18n: makeDescriptionI18n(
                    'Tara Westover recounts growing up in a strict, isolated household and her path toward education against steep odds. Her memoir explores family loyalty, identity, and what it costs to rewrite your own life story. The narrative is both gripping and introspective, showing how knowledge can be liberating and painful at once. Critically acclaimed and a major bestseller, it is a powerful read for anyone drawn to stories of resilience.',
                    'Hồi ký về tuổi thơ khép kín trong một gia đình cực đoan và hành trình tự học để bước ra thế giới. Câu chuyện chạm đến lòng trung thành với gia đình, bản sắc cá nhân và cái giá của việc viết lại cuộc đời mình.'
                )
            },
            {
                titleI18n: {
                    en: 'Thinking, Fast and Slow',
                    vi: 'Tư Duy Nhanh và Chậm'
                },
                isbn: '9780374533557',
                author: 'Daniel Kahneman',
                category: 'Non-Fiction',
                publisher: 'Farrar, Straus and Giroux',
                publicationYear: 2011,
                pageCount: 499,
                descriptionI18n: makeDescriptionI18n(
                    'Nobel laureate Daniel Kahneman explains two modes of thinking: fast, intuitive judgments and slow, deliberate reasoning. Through experiments and everyday examples, he shows how biases shape decisions in finance, medicine, and daily life. The book challenges readers to notice mental shortcuts and design better choices. Widely influential in psychology and business, it rewards anyone who wants sharper judgment and clearer thinking.',
                    'Daniel Kahneman mô tả hai “hệ thống” tư duy: nhanh-trực giác và chậm-suy xét. Qua thí nghiệm và ví dụ đời thường, ông cho thấy các thiên kiến chi phối quyết định và cách ta có thể thiết kế lựa chọn tốt hơn.'
                )
            },
            {
                titleI18n: {
                    en: 'The Diary of a Young Girl',
                    vi: 'Nhật Ký Anne Frank'
                },
                isbn: '9780553296983',
                author: 'Anne Frank',
                category: 'History',
                publisher: 'Bantam',
                publicationYear: 1993,
                pageCount: 283,
                descriptionI18n: makeDescriptionI18n(
                    'Anne Frank writes with startling honesty about adolescence, hope, and fear while hiding from Nazi persecution. Her diary captures daily life under extraordinary danger, offering an intimate perspective on history that statistics cannot convey. The writing is tender, observant, and painfully human. One of the most read accounts of the Holocaust, it remains essential, heartbreaking, and enduring.',
                    'Nhật ký của Anne Frank ghi lại tuổi thiếu niên trong những ngày trốn chạy phát xít, vừa hồn nhiên vừa đau xót. Những trang viết chân thật biến lịch sử khắc nghiệt thành trải nghiệm con người cụ thể và ám ảnh.'
                )
            },
            {
                titleI18n: {
                    en: 'Guns, Germs, and Steel',
                    vi: 'Súng, Vi Trùng và Thép'
                },
                isbn: '9780393317558',
                author: 'Jared Diamond',
                category: 'History',
                publisher: 'W. W. Norton',
                publicationYear: 1999,
                pageCount: 480,
                descriptionI18n: makeDescriptionI18n(
                    'Jared Diamond investigates why some societies accumulated power and technology faster than others, emphasizing geography, domesticated species, and disease. The book synthesizes archaeology, biology, and history into a sweeping argument about human development. It invites debate while pushing readers to think beyond simple cultural explanations. Winner of the Pulitzer Prize, it is a provocative read for big-question thinkers.',
                    'Jared Diamond lý giải vì sao các xã hội phát triển không đồng đều, nhấn mạnh vai trò của địa lý, loài vật thuần hóa và dịch bệnh. Tác phẩm tổng hợp nhiều ngành để đưa ra một lập luận lớn về tiến trình lịch sử nhân loại.'
                )
            },
            {
                titleI18n: {
                    en: 'Into the Wild',
                    vi: 'Vào Trong Hoang Dã'
                },
                isbn: '9780385486804',
                author: 'Jon Krakauer',
                category: 'Non-Fiction',
                publisher: 'Anchor',
                publicationYear: 1997,
                pageCount: 207,
                descriptionI18n: makeDescriptionI18n(
                    'Jon Krakauer follows the journey of Christopher McCandless, who abandoned comfort to seek meaning in the Alaskan wilderness. The narrative blends investigation with reflection as it asks what freedom, risk, and idealism can cost. It explores the pull of adventure and the consequences of going it alone. Riveting and debated for decades, it is a modern nonfiction classic for readers who like true stories with moral complexity.',
                    'Hành trình của Christopher McCandless rời bỏ tiện nghi để tìm ý nghĩa trong hoang dã Alaska. Tác phẩm vừa điều tra vừa suy ngẫm về tự do, lý tưởng, rủi ro và cái giá của việc đi một mình.'
                )
            },

            // Self-Help
            {
                titleI18n: {
                    en: 'Atomic Habits',
                    vi: 'Thói Quen Nguyên Tử'
                },
                isbn: '9780735211292',
                author: 'James Clear',
                category: 'Self-Help',
                publisher: 'Avery',
                publicationYear: 2018,
                pageCount: 320,
                descriptionI18n: makeDescriptionI18n(
                    'James Clear breaks down habit change into small, repeatable systems built around cues, cravings, responses, and rewards. Instead of relying on motivation, he teaches environment design and identity-based habits that stick. The approach is practical and measurable, with tactics you can apply immediately. A blockbuster bestseller, it is ideal for readers who want consistent progress through small wins.',
                    'James Clear phân tích việc thay đổi thói quen bằng các hệ thống nhỏ dựa trên tín hiệu, khao khát, phản hồi và phần thưởng. Ông nhấn mạnh thiết kế môi trường và thói quen gắn với bản sắc để tạo ra tiến bộ bền vững.'
                )
            },
            {
                titleI18n: {
                    en: 'The Power of Now',
                    vi: 'Sức Mạnh Của Hiện Tại'
                },
                isbn: '9781577314806',
                author: 'Eckhart Tolle',
                category: 'Self-Help',
                publisher: 'New World Library',
                publicationYear: 2004,
                pageCount: 229,
                descriptionI18n: makeDescriptionI18n(
                    'Eckhart Tolle encourages readers to step out of rumination and anxiety by anchoring attention in the present moment. With a spiritual but accessible approach, he discusses ego, suffering, and mindful awareness in everyday life. The book aims to help you notice thought patterns and create space for calm. A long-running bestseller, it resonates with readers seeking clarity, peace, and perspective.',
                    'Eckhart Tolle mời người đọc rời khỏi vòng lặp lo âu bằng cách neo tâm trí vào hiện tại. Tác phẩm nói về cái tôi, khổ đau và chánh niệm trong đời sống thường ngày, giúp nhận ra khuôn mẫu suy nghĩ và tạo khoảng lặng.'
                )
            },
            {
                titleI18n: {
                    en: 'The 7 Habits of Highly Effective People',
                    vi: '7 Thói Quen Của Người Hiệu Quả'
                },
                isbn: '9780743269513',
                author: 'Stephen R. Covey',
                category: 'Self-Help',
                publisher: 'Simon & Schuster',
                publicationYear: 2004,
                pageCount: 381,
                descriptionI18n: makeDescriptionI18n(
                    'Stephen R. Covey offers a principle-centered framework for personal and professional effectiveness. The habits move from self-mastery to collaboration and leadership, emphasizing character and long-term thinking over quick hacks. The ideas are structured, memorable, and easy to revisit as life changes. One of the most influential business books ever, it is a foundational guide for goal-driven readers.',
                    'Stephen R. Covey đưa ra khuôn khổ hiệu quả dựa trên nguyên tắc, từ làm chủ bản thân đến hợp tác và lãnh đạo. Các thói quen tập trung vào nhân cách và tư duy dài hạn thay vì mẹo vặt, dễ ghi nhớ và áp dụng lâu dài.'
                )
            },
            {
                titleI18n: {
                    en: 'How to Win Friends and Influence People',
                    vi: 'Đắc Nhân Tâm'
                },
                isbn: '9780671027032',
                author: 'Dale Carnegie',
                category: 'Self-Help',
                publisher: 'Simon & Schuster',
                publicationYear: 1998,
                pageCount: 288,
                descriptionI18n: makeDescriptionI18n(
                    'Dale Carnegie distills timeless communication skills: listening well, showing genuine interest, and handling conflict with tact. The advice is practical and surprisingly modern, rooted in empathy rather than manipulation. It helps readers build trust, reduce friction, and lead through respect. A perennial bestseller for good reason, it is ideal for improving relationships at work and beyond.',
                    'Dale Carnegie đúc kết kỹ năng giao tiếp nền tảng: lắng nghe, quan tâm chân thành và xử lý xung đột tinh tế. Lời khuyên thực tế, lấy sự đồng cảm làm gốc, giúp xây dựng niềm tin và cải thiện các mối quan hệ.'
                )
            },
            {
                titleI18n: {
                    en: 'Deep Work',
                    vi: 'Làm Việc Sâu Sắc'
                },
                isbn: '9781455586691',
                author: 'Cal Newport',
                category: 'Self-Help',
                publisher: 'Grand Central Publishing',
                publicationYear: 2016,
                pageCount: 296,
                descriptionI18n: makeDescriptionI18n(
                    'Cal Newport argues that focused, distraction-free concentration is a competitive advantage in modern knowledge work. He offers strategies for building routines, resisting shallow tasks, and producing higher-quality output. The book blends research with actionable methods you can test immediately. Popular with students and professionals alike, it is a strong read for anyone battling constant notifications.',
                    'Cal Newport cho rằng khả năng tập trung sâu là lợi thế cạnh tranh trong công việc tri thức. Ông đưa ra chiến lược tạo thói quen, giảm việc hời hợt và nâng chất lượng đầu ra bằng những phương pháp thực hành ngay.'
                )
            },

            // Thriller & Mystery
            {
                titleI18n: {
                    en: 'The Da Vinci Code',
                    vi: 'Mật Mã Da Vinci'
                },
                isbn: '9780307474278',
                author: 'Dan Brown',
                category: 'Thriller',
                publisher: 'Anchor',
                publicationYear: 2009,
                pageCount: 480,
                descriptionI18n: makeDescriptionI18n(
                    'A murder in the Louvre pulls symbologist Robert Langdon into a high-speed puzzle of codes, art history, and secret societies. The story mixes real-world landmarks with conspiratorial intrigue and relentless cliffhangers. Themes of belief, secrecy, and interpretation run beneath the chase. A worldwide blockbuster, it is ideal for readers who want a fast, twisty adventure.',
                    'Một vụ án tại bảo tàng Louvre kéo Robert Langdon vào mê cung mật mã, nghệ thuật và các hội kín. Cốt truyện dồn dập, đan xen địa danh có thật và bí ẩn tôn giáo, cuốn người đọc vào cuộc rượt đuổi nghẹt thở.'
                )
            },
            {
                titleI18n: {
                    en: 'Gone Girl',
                    vi: 'Cô Gái Mất Tích'
                },
                isbn: '9780307588371',
                author: 'Gillian Flynn',
                category: 'Thriller',
                publisher: 'Crown',
                publicationYear: 2012,
                pageCount: 415,
                descriptionI18n: makeDescriptionI18n(
                    'When Amy Dunne vanishes, suspicion falls on her husband Nick, and the media frenzy turns their marriage into a public trial. Told through shifting perspectives, the novel explores deception, performance, and power inside intimate relationships. The tension escalates as truth becomes harder to separate from storytelling. A modern bestseller with razor-sharp twists, it is essential for psychological thriller fans.',
                    'Amy Dunne biến mất và chồng cô trở thành nghi phạm trước cơn sốt truyền thông. Câu chuyện đổi góc nhìn liên tục, bóc tách sự dối trá, quyền lực và màn trình diễn trong hôn nhân, nơi sự thật bị thao túng.'
                )
            },
            {
                titleI18n: {
                    en: 'The Girl with the Dragon Tattoo',
                    vi: 'Cô Gái Có Hình Xăm Rồng'
                },
                isbn: '9780307949486',
                author: 'Stieg Larsson',
                category: 'Thriller',
                publisher: 'Vintage',
                publicationYear: 2011,
                pageCount: 644,
                descriptionI18n: makeDescriptionI18n(
                    'Journalist Mikael Blomkvist teams up with hacker Lisbeth Salander to investigate a decades-old disappearance tied to a powerful family. The mystery unfolds into a darker story of corruption and violence, anchored by two unforgettable leads. It blends investigative detail with high-stakes suspense and social critique. Internationally acclaimed and hugely popular, it is a gripping entry in modern crime fiction.',
                    'Nhà báo Mikael Blomkvist và hacker Lisbeth Salander điều tra một vụ mất tích nhiều thập kỷ gắn với gia tộc quyền lực. Bí ẩn mở ra lớp đen tối của tham nhũng và bạo lực, với hai nhân vật chính khó quên.'
                )
            },
            {
                titleI18n: {
                    en: 'The Silent Patient',
                    vi: 'Bệnh Nhân Câm Lặng'
                },
                isbn: '9781250301697',
                author: 'Alex Michaelides',
                category: 'Thriller',
                publisher: 'Celadon Books',
                publicationYear: 2019,
                pageCount: 336,
                descriptionI18n: makeDescriptionI18n(
                    'Alicia Berenson shoots her husband and then refuses to speak, leaving her motives locked behind silence. A psychotherapist becomes obsessed with unraveling what happened, and the investigation turns increasingly personal. The book explores trauma, obsession, and the stories people tell to survive. A breakout bestseller known for its twist, it delivers tight, page-turning suspense.',
                    'Alicia Berenson bắn chồng rồi im lặng tuyệt đối, khiến động cơ bị khóa kín. Một nhà trị liệu ám ảnh với vụ án, càng đào sâu càng bị cuốn vào, phơi bày chấn thương, ám ảnh và những câu chuyện tự vệ.'
                )
            },
            {
                titleI18n: {
                    en: 'And Then There Were None',
                    vi: 'Và Rồi Chẳng Còn Ai'
                },
                isbn: '9780062073488',
                author: 'Agatha Christie',
                category: 'Thriller',
                publisher: 'William Morrow',
                publicationYear: 2011,
                pageCount: 264,
                descriptionI18n: makeDescriptionI18n(
                    'Ten strangers are invited to an isolated island, where a recorded accusation reveals each has a hidden past. As guests begin to die one by one, paranoia and guilt take over and trust collapses. The novel explores justice, fear, and the inevitability of consequences. Often cited among the best-selling mysteries ever, it is a masterclass in airtight plotting.',
                    'Mười người xa lạ được mời tới hòn đảo biệt lập, nơi một bản ghi âm vạch trần quá khứ của từng người. Khi từng người chết dần, nỗi sợ và tội lỗi bủa vây, kéo sụp mọi niềm tin.'
                )
            },

            // Romance
            {
                titleI18n: {
                    en: 'The Notebook',
                    vi: 'Nhật Ký Tình Yêu'
                },
                isbn: '9780446605236',
                author: 'Nicholas Sparks',
                category: 'Romance',
                publisher: 'Warner Books',
                publicationYear: 1996,
                pageCount: 214,
                descriptionI18n: makeDescriptionI18n(
                    'Noah Calhoun reflects on a summer romance with Allie Nelson that never fully left him. Their story explores devotion, memory, and the choices that shape a life over time. The tone is tender and emotionally direct, built for readers who want a heartfelt tearjerker. Widely loved and adapted for film, it remains a modern romance favorite.',
                    'Noah Calhoun nhớ về mối tình mùa hè với Allie, một ký ức không bao giờ phai. Câu chuyện nói về sự tận tụy, ký ức và những lựa chọn định hình đời người, với giọng điệu dịu dàng và giàu cảm xúc.'
                )
            },
            {
                titleI18n: {
                    en: 'Me Before You',
                    vi: 'Trước Ngày Em Đến'
                },
                isbn: '9780143124542',
                author: 'Jojo Moyes',
                category: 'Romance',
                publisher: 'Penguin Books',
                publicationYear: 2012,
                pageCount: 400,
                descriptionI18n: makeDescriptionI18n(
                    'Louisa Clark takes a job caring for Will Traynor, a man whose life changed after a devastating accident. Their relationship challenges assumptions about independence, dignity, and what it means to live fully. The book blends humor and charm with hard emotional questions, keeping stakes personal and real. A hugely popular bestseller, it is ideal for readers who like romance with depth.',
                    'Louisa Clark chăm sóc Will Traynor sau tai nạn khiến anh thay đổi cuộc đời. Mối quan hệ của họ đặt ra câu hỏi về phẩm giá, độc lập và thế nào là sống trọn vẹn, vừa hài hước vừa day dứt.'
                )
            },
            {
                titleI18n: {
                    en: 'Outlander',
                    vi: 'Người Xa Lạ'
                },
                isbn: '9780440212560',
                author: 'Diana Gabaldon',
                category: 'Romance',
                publisher: 'Dell',
                publicationYear: 1991,
                pageCount: 850,
                descriptionI18n: makeDescriptionI18n(
                    'After being transported from 1940s Scotland to the eighteenth century, Claire Randall must survive political danger and a new kind of love. The novel blends romance with rich historical detail, adventure, and time-travel intrigue. Themes of identity, loyalty, and survival run through every chapter. A beloved start to a long-running series, it is perfect for readers who want epic scope.',
                    'Claire Randall bị đưa từ Scotland thập niên 1940 về thế kỷ 18, nơi cô đối mặt hiểm nguy chính trị và một tình yêu mới. Tác phẩm hòa trộn lãng mạn, lịch sử, phiêu lưu và yếu tố du hành thời gian.'
                )
            },
            {
                titleI18n: {
                    en: 'The Hating Game',
                    vi: 'Trò Chơi Ghét Yêu'
                },
                isbn: '9780062439604',
                author: 'Sally Thorne',
                category: 'Romance',
                publisher: 'William Morrow',
                publicationYear: 2016,
                pageCount: 384,
                descriptionI18n: makeDescriptionI18n(
                    'Lucy and Joshua share an office and a rivalry that turns into a game of one-upmanship, until attraction complicates everything. With sharp banter and slow-building tension, the story explores ambition, vulnerability, and workplace dynamics. The romance is playful but emotionally satisfying, with strong chemistry and humor. A standout modern rom-com, it is fast, fun, and addictive.',
                    'Lucy và Joshua làm chung văn phòng, cạnh tranh đến mức biến thành trò hơn thua, cho đến khi cảm xúc chen vào. Lời thoại sắc sảo, căng thẳng tăng dần, câu chuyện nói về tham vọng, tổn thương và môi trường công sở.'
                )
            },
            {
                titleI18n: {
                    en: 'It Ends with Us',
                    vi: 'Kết Thúc Với Chúng Ta'
                },
                isbn: '9781501110368',
                author: 'Colleen Hoover',
                category: 'Romance',
                publisher: 'Atria Books',
                publicationYear: 2016,
                pageCount: 384,
                descriptionI18n: makeDescriptionI18n(
                    'Lily Bloom begins a relationship that forces her to confront painful patterns and difficult choices. The story mixes romance with a serious look at cycles of harm, resilience, and self-worth. It is emotionally intense and grounded in realistic stakes rather than fantasy. A major bestseller that sparked wide conversation, it is challenging, moving, and ultimately hopeful.',
                    'Lily Bloom bước vào một mối quan hệ buộc cô đối diện những vòng lặp tổn thương và lựa chọn khó khăn. Tác phẩm kết hợp lãng mạn với góc nhìn nghiêm túc về giá trị bản thân, sức bền và hy vọng.'
                )
            },

            // Biography
            {
                titleI18n: {
                    en: 'Steve Jobs',
                    vi: 'Steve Jobs'
                },
                isbn: '9781451648539',
                author: 'Walter Isaacson',
                category: 'Biography',
                publisher: 'Simon & Schuster',
                publicationYear: 2011,
                pageCount: 656,
                descriptionI18n: makeDescriptionI18n(
                    'Walter Isaacson draws on extensive interviews to portray Steve Jobs as visionary, perfectionist, and complicated human being. The book follows the rise of Apple, the creation of iconic products, and the personality clashes that shaped them. It explores creativity, leadership, and the costs of uncompromising standards. Widely read in business and tech, it is a compelling look at innovation in action.',
                    'Walter Isaacson dựa trên nhiều cuộc phỏng vấn để khắc họa Steve Jobs như một nhà tiên phong cầu toàn và phức tạp. Tác phẩm theo dấu sự trỗi dậy của Apple, những sản phẩm biểu tượng và các xung đột cá tính phía sau.'
                )
            },
            {
                titleI18n: {
                    en: 'Becoming',
                    vi: 'Becoming'
                },
                isbn: '9781524763138',
                author: 'Michelle Obama',
                category: 'Biography',
                publisher: 'Crown',
                publicationYear: 2018,
                pageCount: 448,
                descriptionI18n: makeDescriptionI18n(
                    'Michelle Obama tells the story of her life from Chicago childhood to public service and the White House. She writes about identity, family, and the pressures of visibility with warmth and honesty. The memoir balances personal growth with the realities of public leadership. A record-setting bestseller, it is inspiring for readers interested in resilience and purpose.',
                    'Michelle Obama kể về tuổi thơ ở Chicago, hành trình học tập, công việc và những năm ở Nhà Trắng. Hồi ký giàu cảm xúc về bản sắc, gia đình và áp lực của sự chú ý công chúng, truyền cảm hứng về nghị lực và mục đích.'
                )
            },
            {
                titleI18n: {
                    en: 'Elon Musk',
                    vi: 'Elon Musk'
                },
                isbn: '9780062301239',
                author: 'Ashlee Vance',
                category: 'Biography',
                publisher: 'Ecco',
                publicationYear: 2015,
                pageCount: 400,
                descriptionI18n: makeDescriptionI18n(
                    'Ashlee Vance chronicles Elon Musks path from early entrepreneurship to building companies in electric vehicles, spaceflight, and energy. The biography highlights ambition, risk tolerance, and the intense cultures around high-stakes innovation. It also examines how personality and mission can drive both breakthroughs and conflict. Widely discussed in tech circles, it is a fascinating study of modern Silicon Valley drive.',
                    'Ashlee Vance kể lại con đường khởi nghiệp của Elon Musk và hành trình xây dựng các công ty về xe điện, không gian và năng lượng. Tiểu sử làm nổi bật tham vọng, chấp nhận rủi ro và văn hóa đổi mới áp lực cao.'
                )
            },
            {
                titleI18n: {
                    en: 'Born a Crime',
                    vi: 'Sinh Ra Trong Tội Lỗi'
                },
                isbn: '9780399588174',
                author: 'Trevor Noah',
                category: 'Biography',
                publisher: 'Spiegel & Grau',
                publicationYear: 2016,
                pageCount: 304,
                descriptionI18n: makeDescriptionI18n(
                    'Trevor Noah recounts growing up in apartheid and post-apartheid South Africa as the child of a mixed-race relationship that was illegal at the time. His stories blend humor with sharp insight into politics, poverty, and family, making heavy history feel immediate and personal. The memoir explores identity, belonging, and the power of laughter as survival. A celebrated bestseller, it is both hilarious and deeply human.',
                    'Trevor Noah lớn lên ở Nam Phi thời phân biệt chủng tộc, là con của một mối quan hệ bị pháp luật cấm. Câu chuyện pha hài hước và quan sát sắc bén về chính trị, nghèo đói và gia đình, làm lịch sử trở nên gần gũi.'
                )
            },
            {
                titleI18n: {
                    en: 'Long Walk to Freedom',
                    vi: 'Con Đường Dài Tự Do'
                },
                isbn: '9780316548182',
                author: 'Nelson Mandela',
                category: 'Biography',
                publisher: 'Little, Brown and Company',
                publicationYear: 1995,
                pageCount: 656,
                descriptionI18n: makeDescriptionI18n(
                    'Nelson Mandela narrates his journey from rural childhood to anti-apartheid leadership, imprisonment, and eventual presidency. The memoir explores sacrifice, endurance, and the long arc of justice through decades of struggle. It offers a firsthand view of political organizing, moral conviction, and reconciliation. A cornerstone of modern political autobiography, it is essential for readers who want history through lived experience.',
                    'Nelson Mandela kể lại hành trình từ tuổi thơ nông thôn đến lãnh đạo phong trào chống apartheid, những năm tù và vai trò tổng thống. Hồi ký nói về hy sinh, kiên cường và hành trình dài của công lý.'
                )
            },

            // Children
            {
                titleI18n: {
                    en: "Harry Potter and the Sorcerer's Stone",
                    vi: 'Harry Potter và Hòn Đá Phù Thủy'
                },
                isbn: '9780590353427',
                author: 'J.K. Rowling',
                category: 'Children',
                publisher: 'Scholastic',
                publicationYear: 1998,
                pageCount: 309,
                descriptionI18n: makeDescriptionI18n(
                    'Harry discovers he is a wizard and enters a hidden world of magic, friendship, and danger at Hogwarts. As mysteries unfold, the story balances wonder and humor with darker hints of a looming threat. Themes of belonging, courage, and chosen family make it emotionally resonant for all ages. A global phenomenon that launched a generation of readers, it is a perfect gateway to fantasy.',
                    'Harry biết mình là phù thủy và bước vào thế giới phép thuật đầy tình bạn và hiểm nguy ở Hogwarts. Câu chuyện cân bằng giữa kỳ diệu, hài hước và bóng tối, với chủ đề thuộc về, dũng khí và gia đình được lựa chọn.'
                )
            },
            {
                titleI18n: {
                    en: "Charlotte's Web",
                    vi: 'Mạng Nhện Của Charlotte'
                },
                isbn: '9780061124952',
                author: 'E.B. White',
                category: 'Children',
                publisher: 'HarperCollins',
                publicationYear: 2006,
                pageCount: 192,
                descriptionI18n: makeDescriptionI18n(
                    'Wilbur the pig faces an uncertain future until Charlotte the spider devises a brave plan to save him. Their friendship celebrates kindness, loyalty, and the bittersweet nature of growing up. The book is gentle but honest about life and loss, making it powerful for kids and adults alike. A classic of childrens literature, it remains one of the most heartfelt stories for shared reading.',
                    'Chú heo Wilbur đối mặt tương lai bất định cho đến khi nhện Charlotte nghĩ ra kế hoạch cứu bạn. Tình bạn của họ tôn vinh lòng tốt, sự trung thành và vị ngọt đắng của trưởng thành, nhẹ nhàng nhưng thấm thía.'
                )
            },
            {
                titleI18n: {
                    en: 'The Hobbit',
                    vi: 'Người Hobbit'
                },
                isbn: '9780547928227',
                author: 'J.R.R. Tolkien',
                category: 'Children',
                publisher: 'Houghton Mifflin Harcourt',
                publicationYear: 2012,
                pageCount: 300,
                descriptionI18n: makeDescriptionI18n(
                    'Bilbo Baggins is swept from a quiet life into an adventure with dwarves seeking to reclaim their mountain home. Along the way he meets trolls, elves, and the mysterious creature Gollum, discovering courage he did not know he had. The story explores bravery, greed, and the joy of the unexpected journey. A timeless fantasy classic, it is an ideal starting point for Tolkien.',
                    'Bilbo Baggins rời cuộc sống yên bình để cùng người lùn đi tìm lại ngọn núi. Trên đường, ông gặp yêu tinh, người lùn và Gollum bí ẩn, khám phá lòng dũng cảm mà mình chưa từng biết. Tác phẩm cổ điển về phiêu lưu.'
                )
            },
            {
                titleI18n: {
                    en: 'Matilda',
                    vi: 'Matilda'
                },
                isbn: '9780142410370',
                author: 'Roald Dahl',
                category: 'Children',
                publisher: 'Puffin Books',
                publicationYear: 2007,
                pageCount: 240,
                descriptionI18n: makeDescriptionI18n(
                    'Brilliant young Matilda finds refuge in books while navigating neglectful parents and a frightening headmistress. With cleverness and unexpected powers, she learns to stand up for herself and protect the people she cares about. The story mixes comedy with justice, celebrating intelligence and kindness. Funny, sharp, and empowering, this Roald Dahl favorite is a classic for confident young readers.',
                    'Matilda thông minh tìm nơi trú ẩn trong sách khi phải sống với cha mẹ thờ ơ và một hiệu trưởng đáng sợ. Với trí tuệ và năng lực bất ngờ, cô bé học cách tự bảo vệ và giúp người mình yêu quý. Vừa hài hước vừa công bằng.'
                )
            },
            {
                titleI18n: {
                    en: 'Where the Wild Things Are',
                    vi: 'Nơi Quái Vật Ở'
                },
                isbn: '9780060254926',
                author: 'Maurice Sendak',
                category: 'Children',
                publisher: 'HarperCollins',
                publicationYear: 1963,
                pageCount: 48,
                descriptionI18n: makeDescriptionI18n(
                    'After a tantrum, Max sails to a land of wild creatures and becomes their king, only to feel the pull of home. In a few vivid pages, the book captures big emotions: anger, imagination, and the comfort of being loved. It speaks to children with honesty, without talking down to them. Winner of the Caldecott Medal, it is a timeless picture-book classic.',
                    'Sau cơn giận, Max ra khơi tới vùng đất của quái vật và trở thành vua, rồi lại nhớ về nhà. Ít trang nhưng giàu cảm xúc, câu chuyện chạm tới giận dữ, tưởng tượng và sự an ủi của tình yêu thương.'
                )
            },
        ];

        const allProducts = [];

        // Process real books (fetch covers concurrently)
        console.log(`   Processing ${realBooksList.length} real books...`);

        // Fetch all covers concurrently using Promise.all
        const bookProcessingPromises = realBooksList.map(async (book) => {
            let cover = { source: 'placeholder', url: null };
            try {
                console.log(`   Fetching cover for: ${book.titleI18n?.en}`);
                const url = await getBookCover({
                    isbn: book.isbn,
                    title: book.titleI18n?.en,
                    author: book.author,
                });

                if (url) {
                    cover = { source: 'api', url: url };
                }
            } catch (e) {
                console.log(
                    `   Failed to fetch cover for ${book.titleI18n?.en}:`,
                    e.message
                );
            }

            const { titleI18n, descriptionI18n, ...rest } = book;

            return {
                ...rest,
                titleI18n,
                descriptionI18n,
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

        const insertedProductsCount = await insertProductsInBatches(
            allProducts,
            200
        );
        const productIdList = allProducts.map((product) => product._id);
        console.log(`✅ Created ${insertedProductsCount} products\n`);

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
            await runWithRetry(
                () => db.collection('carts').insertMany(cartsToSeed),
                'create carts'
            );
        }
        console.log(`✅ Created ${cartsToSeed.length} carts\n`);

        // ---------------------------------------------------------
        // 5. Seed Orders
        // ---------------------------------------------------------
        console.log('📦 Creating orders...');
        const ordersToSeed = [];

        for (let i = 0; i < 160; i++) {
            const userIndex = faker.number.int({
                min: 1,
                max: customers.length - 1,
            });
            const userId = userIdList[userIndex];

            const orderItems = [];
            const numItems = faker.number.int({ min: 1, max: 5 });
            const usedProductIndexes = new Set();

            for (let j = 0; j < numItems; j++) {
                let pIndex = faker.number.int({
                    min: 0,
                    max: allProducts.length - 1,
                });

                // Avoid duplicates within a single order
                let guard = 0;
                while (usedProductIndexes.has(pIndex) && guard < 10) {
                    pIndex = faker.number.int({
                        min: 0,
                        max: allProducts.length - 1,
                    });
                    guard++;
                }
                usedProductIndexes.add(pIndex);

                const pId = productIdList[pIndex];
                const pData = allProducts[pIndex];

                orderItems.push({
                    productId: pId,
                    titleI18n: pData.titleI18n,
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

            const paymentMethod = faker.helpers.arrayElement(['payos', 'cod']);

            // 80% completed so we have enough eligible purchases for reviews
            const paymentStatus = faker.number.float({ min: 0, max: 1, precision: 0.01 }) < 0.8
                ? 'completed'
                : 'pending';

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
                paymentMethod,
                paymentStatus,
                orderStatus: paymentStatus === 'completed'
                    ? faker.helpers.arrayElement(['processing', 'shipped', 'delivered'])
                    : 'pending',
                total: parseFloat((totalAmount * 1.1 + 5.0).toFixed(2)), // + Tax & Ship
                createdAt: faker.date.past(),
                updatedAt: new Date(),
            });
        }

        await runWithRetry(
            () => db.collection('orders').insertMany(ordersToSeed),
            'create orders'
        );
        console.log(`✅ Created ${ordersToSeed.length} orders\n`);

        // ---------------------------------------------------------
        // 6. Seed Reviews (Completed purchasers only)
        // ---------------------------------------------------------
        console.log('⭐ Creating reviews...');

        const completedOrders = ordersToSeed.filter((o) => o.paymentStatus === 'completed');

        const reviewsToSeed = [];
        const reviewKeySet = new Set();
        const maxReviews = 250;

        for (const order of completedOrders) {
            if (reviewsToSeed.length >= maxReviews) break;

            for (const item of order.items) {
                if (reviewsToSeed.length >= maxReviews) break;

                const key = `${order.userId.toString()}_${item.productId.toString()}`;
                if (reviewKeySet.has(key)) continue;
                reviewKeySet.add(key);

                // Evenly distributed ratings from 1..5
                const rating = (reviewsToSeed.length % 5) + 1;
                const commentByRating = {
                    1: ['Disappointing.', 'Not for me.', 'Would not recommend.', ''],
                    2: ['Could be better.', 'Some parts were okay.', 'Average at best.', ''],
                    3: ['Decent read.', 'Pretty good overall.', 'Met my expectations.', ''],
                    4: ['Really enjoyed it!', 'Recommended.', 'Great quality.', ''],
                    5: ['Amazing!', 'Loved it.', 'Highly recommended!', 'Excellent read!']
                };
                const comment = faker.helpers.arrayElement(commentByRating[rating]);

                // Keep review timestamps somewhat realistic relative to the order
                const createdAt = faker.date.between({
                    from: order.createdAt || faker.date.past(),
                    to: new Date()
                });

                reviewsToSeed.push({
                    productId: item.productId,
                    userId: order.userId,
                    rating,
                    comment,
                    createdAt,
                    updatedAt: createdAt
                });
            }
        }

        if (reviewsToSeed.length > 0) {
            await runWithRetry(
                () => db.collection('reviews').insertMany(reviewsToSeed),
                'create reviews'
            );

            // Update product aggregates for products that received reviews
            const reviewStats = await db
                .collection('reviews')
                .aggregate([
                    {
                        $group: {
                            _id: '$productId',
                            avgRating: { $avg: '$rating' },
                            numReviews: { $sum: 1 }
                        }
                    }
                ])
                .toArray();

            for (const stat of reviewStats) {
                const roundedRating = Math.round(stat.avgRating * 10) / 10;
                await db.collection('products').updateOne(
                    { _id: stat._id },
                    {
                        $set: {
                            rating: roundedRating,
                            numReviews: stat.numReviews,
                            updatedAt: new Date()
                        }
                    }
                );
            }
        }

        console.log(`✅ Created ${reviewsToSeed.length} reviews\n`);

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
        console.log(
            `   Reviews: ${await db.collection('reviews').countDocuments()}`
        );

        console.log('\n🎉 Database seeded successfully!\n');
        console.log('🔑 Admin: admin@bookstore.com / admin123');
        console.log('🔑 User:  john@test.com / password123\n');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await closeDB();
    }
}

async function runSeedWithRetry(maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
        try {
            await seedData();
            return;
        } catch (error) {
            const retryable = isRetryableError(error);
            if (!retryable || attempt > maxRetries) {
                process.exit(1);
            }
            console.log(
                `🔁 Retry seeding (attempt ${attempt + 1}/${maxRetries + 1}) due to network reset...`
            );
            await sleep(1000 * attempt);
        }
    }
}

runSeedWithRetry();
