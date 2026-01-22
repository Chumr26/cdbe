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
                descriptionI18n: {
                    en: `Nick Carraway moves to Long Island and is drawn into the world of his mysterious neighbor, Jay Gatsby. Gatsby's extravagant parties, whispered rumors, and carefully crafted persona hide a single-minded desire to reclaim a past love, Daisy Buchanan. As Nick becomes a witness and participant, the story reveals the fragile foundations of wealth, status, and reinvention in the Jazz Age. Fitzgerald contrasts glittering scenes with quiet despair, showing how ambition can blur into obsession. The novel follows a tightening spiral of deception, longing, and moral compromise, ending in a tragedy that exposes the emptiness beneath Gatsby's dream. Beyond the romance, the book critiques a culture of money and spectacle, asking what the American Dream costs and who gets excluded from it. Its language is lyrical yet precise, and its short length masks a layered structure of symbolism, memory, and loss. The Great Gatsby remains a sharp, haunting portrait of aspiration and disillusionment.`,
                    vi: `Nick Carraway chuyển đến Long Island và bị cuốn vào thế giới của người hàng xóm bí ẩn Jay Gatsby. Những bữa tiệc xa hoa, lời đồn dày đặc và hình ảnh được dàn dựng của Gatsby che giấu một khát vọng duy nhất: giành lại tình yêu cũ Daisy Buchanan. Khi Nick trở thành nhân chứng và người tham dự, câu chuyện phơi bày nền móng mong manh của giàu sang, địa vị và sự “tái tạo bản thân” trong thời Jazz. Fitzgerald đối lập ánh hào quang với nỗi trống rỗng âm ỉ, cho thấy tham vọng có thể biến thành ám ảnh như thế nào. Mạch truyện xoáy sâu vào dối trá, khao khát và thỏa hiệp đạo đức, kết thúc bằng bi kịch lột trần sự rỗng tuếch của giấc mơ Gatsby. Vượt lên chuyện tình, tác phẩm là lời phê phán một nền văn hóa tôn sùng tiền bạc và phô diễn, đặt câu hỏi về cái giá của Giấc mơ Mỹ và những ai bị bỏ lại bên lề.`
                }
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
                descriptionI18n: {
                    en: `Set in the Depression-era town of Maycomb, Alabama, the novel follows Scout Finch as she grows from a curious child into a more reflective observer of human cruelty and kindness. Her father, Atticus Finch, defends Tom Robinson, a Black man falsely accused of assault, and the trial exposes the town's racial bias and fear. Through Scout's youthful voice, Harper Lee blends humor, nostalgia, and sharp moral insight. The story traces Scout's evolving understanding of empathy as she learns to “climb into someone else's skin,” while her brother Jem confronts the pain of injustice. The mysterious neighbor Boo Radley becomes a symbol of how communities create myths to avoid seeing the humanity of the “other.” The novel examines moral courage, the limits of law, and the way prejudice is taught and sustained. Its courtroom drama is gripping, but its quiet domestic scenes carry equal weight. The book remains a powerful coming-of-age story and a compassionate critique of racism and social judgment.`,
                    vi: `Bối cảnh thị trấn Maycomb thời Đại Khủng Hoảng, câu chuyện theo chân Scout Finch khi cô bé dần trưởng thành và nhìn rõ hơn sự tàn nhẫn lẫn lòng tốt của con người. Cha cô, luật sư Atticus Finch, bào chữa cho Tom Robinson, một người da màu bị buộc tội oan, và phiên tòa phơi bày định kiến chủng tộc cùng nỗi sợ hãi của cộng đồng. Qua giọng kể trẻ thơ, Harper Lee hòa trộn chất hài hước, ký ức và cái nhìn đạo đức sắc sảo. Scout học cách đồng cảm khi hiểu rằng phải “bước vào đôi giày của người khác,” còn Jem đối mặt với nỗi đau của bất công. Nhân vật Boo Radley là biểu tượng cho việc cộng đồng dựng nên huyền thoại để tránh nhìn nhận con người thật. Tác phẩm khảo sát dũng khí đạo đức, giới hạn của luật pháp và cách định kiến được truyền dạy. Vừa là câu chuyện trưởng thành, vừa là lời phê phán nhân ái về phân biệt đối xử và phán xét xã hội.`
                }
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
                descriptionI18n: {
                    en: `Winston Smith works for the Ministry of Truth in Oceania, a totalitarian state where history is rewritten and language is engineered to limit thought. He quietly rebels by keeping a diary and pursuing a forbidden relationship with Julia, hoping to recover a sense of personal truth. Orwell portrays a society of constant surveillance, psychological manipulation, and ritualized loyalty to Big Brother. The Party's power is not only political but epistemic: it controls reality by controlling the record of the past. As Winston seeks contact with an imagined resistance, the novel shows how fear, propaganda, and isolation can break individual will. The second half becomes a chilling study of interrogation and self-betrayal, revealing the regime's goal of absolute dominance over the mind. With its stark, precise prose, 1984 explores the fragility of memory, the politics of language, and the ways authoritarian systems distort human relationships. Its terms—doublethink, thoughtcrime, Newspeak—remain essential for discussing modern surveillance and disinformation.`,
                    vi: `Winston Smith làm việc tại Bộ Sự Thật ở Oceania, nơi lịch sử bị sửa lại liên tục và ngôn ngữ bị thiết kế để hạn chế tư duy. Anh âm thầm nổi loạn bằng cuốn nhật ký và mối quan hệ bị cấm với Julia, mong giữ lại chút sự thật riêng tư. Orwell vẽ nên một xã hội giám sát toàn diện, thao túng tâm lý và tôn thờ Big Brother như nghi lễ. Quyền lực của Đảng không chỉ là chính trị mà còn là nhận thức: kiểm soát quá khứ để kiểm soát thực tại. Khi Winston tìm kiếm một phong trào kháng cự, câu chuyện cho thấy nỗi sợ, tuyên truyền và cô lập có thể bẻ gãy ý chí cá nhân. Nửa sau trở thành nghiên cứu lạnh lùng về tra tấn và tự phản bội, phơi bày mục tiêu thống trị tuyệt đối lên tâm trí con người. Với văn phong sắc gọn, 1984 đào sâu vào sự mong manh của ký ức, chính trị của ngôn ngữ và cách chế độ độc tài bóp méo các mối quan hệ.`
                }
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
                descriptionI18n: {
                    en: `Elizabeth Bennet, the witty and independent second daughter of a modest family, must navigate a society where marriage determines security and status. Her sharp exchanges with the reserved Mr. Darcy begin in mutual dislike, shaped by pride, rumor, and first impressions. As misunderstandings unravel, Austen reveals the social machinery of class, inheritance, and reputation that pressures individuals into performance. The novel's humor is grounded in observation: foolish suitors, anxious parents, and the constant calculations of propriety. Yet it is also a story of moral growth, as Elizabeth and Darcy learn to question their own judgments and recognize each other's integrity. Austen's prose balances romance with satire, showing how love can be both personal and political within a rigid social order. The pacing is deliberate, letting relationships mature through conversation, letters, and quiet moments of self-realization. Pride and Prejudice remains a masterclass in character-driven storytelling, prized for its intelligence, warmth, and enduring insights about bias and self-knowledge.`,
                    vi: `Elizabeth Bennet, cô con gái thứ hai thông minh và độc lập của một gia đình trung lưu, phải sống trong xã hội nơi hôn nhân quyết định an toàn và địa vị. Những cuộc đối đáp sắc sảo giữa cô và Mr. Darcy khởi đầu bằng ác cảm, bị định hình bởi kiêu hãnh, lời đồn và ấn tượng ban đầu. Khi các hiểu lầm dần được tháo gỡ, Austen phơi bày cơ chế giai cấp, thừa kế và danh tiếng khiến con người phải diễn vai. Tính hài hước của tác phẩm đến từ quan sát tinh tế: những chàng trai ngốc nghếch, cha mẹ lo lắng và các phép tắc xã hội ràng buộc. Đồng thời, đây là câu chuyện trưởng thành về đạo đức, khi Elizabeth và Darcy học cách nghi ngờ chính phán xét của mình và nhận ra phẩm chất thật của đối phương. Văn phong cân bằng giữa lãng mạn và châm biếm, cho thấy tình yêu vừa cá nhân vừa mang tính xã hội trong một trật tự cứng nhắc. Pride and Prejudice là kiệt tác xây dựng nhân vật, giàu trí tuệ, ấm áp và bền vững trong những bài học về thiên kiến và tự nhận thức.`
                }
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
                descriptionI18n: {
                    en: `Holden Caulfield is expelled from prep school and drifts through New York City over a few uneasy days, avoiding home and the adult world he distrusts. His narration is raw, funny, and defensive, masking grief and vulnerability with sarcasm. He is repelled by what he calls “phoniness,” yet he longs for genuine connection and a safe place where innocence can be preserved. The novel traces his encounters with teachers, strangers, former classmates, and his beloved younger sister Phoebe, who becomes the emotional anchor of the story. Beneath the restless wandering lies a portrait of a teenager struggling with loss, trauma, and the fear of growing up. Salinger's language captures the rhythms of adolescent thought—fragmented, contradictory, intensely sincere. The book does not resolve Holden's pain neatly; instead, it offers a compassionate view of adolescence as a period of confusion and moral sensitivity. The Catcher in the Rye remains a landmark for its voice, its honesty, and its uneasy refusal to simplify the transition to adulthood.`,
                    vi: `Holden Caulfield bị đuổi khỏi trường và lang thang ở New York trong vài ngày đầy bất an, cố tránh về nhà và né thế giới người lớn mà cậu không tin tưởng. Giọng kể vừa hài hước vừa phòng vệ, che giấu nỗi buồn và tổn thương bằng mỉa mai. Cậu chán ghét sự “giả tạo” nhưng lại khao khát kết nối chân thành và một nơi giữ được sự trong trẻo. Câu chuyện theo dấu những cuộc gặp với thầy giáo, người lạ, bạn cũ và đặc biệt là em gái Phoebe—điểm tựa cảm xúc của Holden. Bên dưới sự lang thang là một bức chân dung thiếu niên vật lộn với mất mát, chấn thương và nỗi sợ trưởng thành. Ngôn ngữ của Salinger tái hiện nhịp nghĩ tuổi mới lớn: vụn vỡ, mâu thuẫn nhưng rất thành thật. Tác phẩm không giải quyết nỗi đau một cách gọn gàng; nó nhìn tuổi trẻ bằng sự cảm thông và cho thấy sự chuyển tiếp sang người lớn đầy mơ hồ và nhạy cảm. The Catcher in the Rye nổi bật vì giọng kể độc đáo, sự trung thực và cách từ chối đơn giản hóa tuổi trưởng thành.`
                }
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
                descriptionI18n: {
                    en: `Clean Code presents software development as a craft focused on clarity and responsibility. Robert C. Martin argues that readable code reduces defects, makes change safer, and allows teams to move faster over time. He breaks down principles through concrete examples—good and bad—covering naming, function size, error handling, unit tests, comments, and refactoring. The book teaches how to structure modules, avoid duplication, and keep dependencies manageable. It also explores the psychology of code: how small shortcuts accumulate into fragile systems, and how discipline keeps complexity in check. While some examples are in Java, the ideas are broadly applicable to any language. The tone is opinionated but practical, encouraging readers to treat code as a medium for communication rather than a mere set of instructions. By the end, you gain a toolkit for recognizing “code smells” and an ethic for improving them. Clean Code is not a style guide; it is a mindset for writing software that teammates can understand, trust, and evolve.`,
                    vi: `Clean Code xem phát triển phần mềm như một nghề thủ công đặt trọng tâm vào sự rõ ràng và trách nhiệm. Robert C. Martin lập luận rằng mã dễ đọc giúp giảm lỗi, làm thay đổi an toàn hơn và tăng tốc độ làm việc về lâu dài. Ông trình bày nguyên tắc qua ví dụ cụ thể—cả tốt lẫn xấu—từ cách đặt tên, độ dài hàm, xử lý lỗi, kiểm thử, chú thích đến refactor. Cuốn sách hướng dẫn cách tổ chức mô-đun, tránh trùng lặp và kiểm soát phụ thuộc. Đồng thời, nó bàn về tâm lý của code: những lối tắt nhỏ tích tụ thành hệ thống mong manh ra sao, và kỷ luật giúp giữ độ phức tạp trong tầm kiểm soát như thế nào. Dù ví dụ chủ yếu dùng Java, ý tưởng áp dụng được cho mọi ngôn ngữ. Tác phẩm có quan điểm rõ ràng nhưng thực tiễn, khuyến khích coi code là phương tiện giao tiếp chứ không chỉ là mệnh lệnh cho máy. Kết thúc, bạn có bộ công cụ nhận diện “mùi code” và tinh thần cải thiện liên tục.`
                }
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
                descriptionI18n: {
                    en: `The Pragmatic Programmer is a collection of field-tested practices for building software with sound judgment. David Thomas and Andrew Hunt cover a wide range of topics: debugging strategies, automation, version control, estimation, refactoring, and the importance of clear communication. The core message is pragmatism—choose approaches that work in context, measure outcomes, and iterate safely rather than chasing theoretical perfection. The authors emphasize responsibility for quality, encouraging developers to understand the systems they build and the consequences of their choices. Memorable metaphors like the “broken window” and “tracer bullet” help frame maintenance and delivery in practical terms. The book is tool-agnostic and focused on habits: small, repeatable behaviors that improve reliability and teamwork. It also addresses learning, urging programmers to stay curious and adapt as technologies change. Whether you are new or experienced, the lessons help you think like a craftsman: deliberate, communicative, and resilient under real-world constraints.`,
                    vi: `The Pragmatic Programmer tập hợp các thực hành đã được kiểm chứng cho việc xây dựng phần mềm với tư duy đúng đắn. David Thomas và Andrew Hunt đi qua nhiều chủ đề: gỡ lỗi, tự động hóa, kiểm soát phiên bản, ước lượng, refactor và giao tiếp rõ ràng. Thông điệp trung tâm là sự thực dụng—chọn cách làm phù hợp với bối cảnh, đo lường kết quả và lặp lại an toàn thay vì chạy theo sự hoàn hảo lý thuyết. Tác giả nhấn mạnh trách nhiệm về chất lượng, khuyến khích lập trình viên hiểu hệ thống mình tạo ra và hệ quả của lựa chọn kỹ thuật. Những ẩn dụ như “cửa sổ vỡ” hay “đạn truy vết” giúp nhìn bảo trì và triển khai bằng góc nhìn thực tế. Cuốn sách không lệ thuộc công cụ, tập trung vào thói quen nhỏ lặp lại để tăng độ tin cậy và hiệu quả nhóm. Nó cũng nói về học tập liên tục, thúc đẩy sự tò mò và khả năng thích nghi với công nghệ thay đổi. Dù mới vào nghề hay đã nhiều kinh nghiệm, bạn vẫn nhận được cách nghĩ của người thợ lành nghề: cẩn trọng, giao tiếp tốt và bền bỉ trong điều kiện thực tế.`
                }
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
                descriptionI18n: {
                    en: `Introduction to Algorithms (CLRS) is a comprehensive reference that explains algorithms with mathematical rigor and practical intuition. It begins with foundational techniques like asymptotic analysis, divide-and-conquer, and sorting, then expands to data structures, graph algorithms, greedy methods, dynamic programming, and randomized approaches. Each chapter combines proofs of correctness with running-time analysis, teaching not just how an algorithm works but why it is reliable. The book is designed for serious study: it includes exercises ranging from basic checks to research-level challenges. While it is often used in university courses, it also serves as a long-term desk reference for engineers who need authoritative explanations. The breadth is immense—covering shortest paths, network flows, NP-completeness, and beyond—yet the organization keeps the progression coherent. CLRS is demanding but rewarding; it builds durable intuition for algorithm design and analysis. For readers preparing for interviews, it offers depth that goes far beyond memorized patterns, grounding problem solving in first principles.`,
                    vi: `Introduction to Algorithms (CLRS) là tài liệu tham khảo toàn diện, giải thích thuật toán với tính chặt chẽ toán học và trực giác thực tiễn. Sách bắt đầu từ phân tích độ phức tạp, chia để trị và sắp xếp, rồi mở rộng sang cấu trúc dữ liệu, thuật toán đồ thị, phương pháp tham lam, quy hoạch động và các kỹ thuật ngẫu nhiên. Mỗi chương kết hợp chứng minh đúng đắn với phân tích thời gian chạy, giúp người học hiểu không chỉ “cách làm” mà còn “vì sao đúng.” Đây là sách dành cho học tập nghiêm túc, với bài tập từ cơ bản đến nâng cao kiểu nghiên cứu. Dù thường dùng trong đại học, nó cũng là tài liệu bàn làm việc lâu dài cho kỹ sư cần lời giải thích đáng tin cậy. Phạm vi rất rộng—đường đi ngắn, luồng mạng, NP-đầy đủ và hơn thế—nhưng bố cục vẫn mạch lạc. CLRS khó nhưng xứng đáng, vì xây dựng trực giác bền vững về thiết kế và phân tích thuật toán. Với người ôn phỏng vấn, sách cung cấp nền tảng sâu vượt xa việc học thuộc mẫu.`
                }
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
                descriptionI18n: {
                    en: `Design Patterns: Elements of Reusable Object-Oriented Software catalogs 23 classic patterns for solving recurring design problems. The “Gang of Four” explain each pattern's intent, structure, participants, and consequences, using diagrams and examples to show when it is appropriate. Patterns like Factory Method, Observer, Strategy, and Decorator give developers a shared vocabulary for expressing architectural ideas. The book's strength is not just the patterns themselves, but the way it frames trade-offs: flexibility versus simplicity, runtime composition versus inheritance, decoupling versus complexity. It teaches readers to recognize repeated design forces and choose solutions deliberately. While rooted in object-oriented thinking, many patterns translate to modern languages and functional styles. The text is dense but precise, serving as a reference that deepens over time. For teams, it reduces ambiguity in design discussions and improves code review quality. Design Patterns remains a foundational work because it turns experience into reusable knowledge and encourages thoughtful, communicative design.`,
                    vi: `Design Patterns: Elements of Reusable Object-Oriented Software tổng hợp 23 mẫu thiết kế kinh điển cho các bài toán lặp lại trong phát triển phần mềm. “Gang of Four” trình bày mục đích, cấu trúc, vai trò và hệ quả của từng pattern, kèm sơ đồ và ví dụ để chỉ ra khi nào nên áp dụng. Các mẫu như Factory Method, Observer, Strategy, Decorator tạo ra ngôn ngữ chung để thảo luận kiến trúc. Giá trị lớn của sách không chỉ ở danh sách mẫu, mà ở cách phân tích đánh đổi: linh hoạt so với đơn giản, kết hợp lúc chạy so với kế thừa, tách rời so với độ phức tạp. Nó giúp người đọc nhận ra lực thiết kế lặp lại và chọn giải pháp có chủ đích. Dù gốc ở hướng đối tượng, nhiều pattern vẫn áp dụng tốt cho ngôn ngữ hiện đại và cả phong cách hàm. Văn bản dày đặc nhưng chính xác, phù hợp làm tài liệu tra cứu dài hạn. Trong làm việc nhóm, sách giảm mơ hồ khi thảo luận thiết kế và nâng chất lượng review. Design Patterns bền vững vì biến kinh nghiệm thành tri thức tái sử dụng.`
                }
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
                descriptionI18n: {
                    en: `You Don't Know JS is a deep dive into how JavaScript actually works beyond surface syntax. Kyle Simpson explains scope, closures, "this" binding, prototypes, and asynchronous behavior with a focus on mental models rather than memorized rules. He challenges common misconceptions and shows how small misunderstandings can lead to subtle bugs. The book uses short examples to demonstrate how the language resolves variables, handles coercion, and executes code in the event loop. It emphasizes reading the spec's intent without requiring you to become a standards expert. By reframing JavaScript as a coherent system, the series helps developers reason about real-world code, debug confidently, and write more intentional APIs. The tone is conversational but rigorous, inviting readers to test assumptions and verify behavior. It's especially valuable for developers who can already write JavaScript but want mastery: to predict edge cases, design reliable abstractions, and understand the “why” behind the language's quirks. This volume is both a corrective and a foundation for long-term growth in JavaScript.`,
                    vi: `You Don't Know JS đi sâu vào cách JavaScript vận hành thực sự, vượt xa mức cú pháp bề mặt. Kyle Simpson giải thích phạm vi, closure, ràng buộc "this", prototype và bất đồng bộ bằng mô hình tư duy thay vì các quy tắc thuộc lòng. Ông thách thức những hiểu lầm phổ biến và chỉ ra cách các sai lệch nhỏ dẫn đến lỗi khó chịu. Sách dùng ví dụ ngắn để minh họa cách ngôn ngữ tra cứu biến, ép kiểu và xử lý vòng lặp sự kiện. Tác giả giúp người đọc hiểu tinh thần của đặc tả mà không cần trở thành chuyên gia chuẩn hóa. Khi nhìn JavaScript như một hệ thống nhất quán, bạn sẽ suy luận chắc chắn hơn về code thực tế, debug tự tin hơn và thiết kế API có chủ đích. Văn phong gần gũi nhưng nghiêm túc, khuyến khích kiểm tra giả định và quan sát hành vi. Đây là tài liệu giá trị cho lập trình viên đã biết JavaScript nhưng muốn đạt mức làm chủ: dự đoán góc cạnh, xây dựng trừu tượng bền vững và hiểu “vì sao” đằng sau những điểm kỳ quặc của ngôn ngữ.`,
                }
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
                descriptionI18n: {
                    en: `A Brief History of Time introduces readers to the biggest ideas of modern cosmology without heavy equations. Stephen Hawking explains space-time, black holes, the Big Bang, and the quest for a unified theory in a narrative that blends physics with curiosity about the universe's origin. He describes how scientific models evolve—from Newton to Einstein to quantum theory—and how each framework reshapes our understanding of reality. The book explores concepts like the arrow of time, event horizons, and the possibility of multiple universes, always tying them back to what they mean for ordinary observers. Hawking's voice is both authoritative and playful, using analogies and thought experiments to keep abstract ideas grounded. The result is a tour of the cosmos that emphasizes wonder without sacrificing rigor. It is not a technical textbook; it is an invitation to think about why the universe is the way it is and how far human inquiry has come. For many readers, it serves as a first window into cosmology and a reminder that scientific questions are also deeply philosophical.`,
                    vi: `A Brief History of Time giới thiệu những ý tưởng lớn của vũ trụ học hiện đại mà không sa vào công thức nặng nề. Stephen Hawking giải thích không-thời gian, hố đen, Vụ Nổ Lớn và hành trình tìm kiếm “lý thuyết thống nhất” bằng câu chuyện giàu tò mò. Ông mô tả cách các mô hình khoa học thay đổi—từ Newton, Einstein đến cơ học lượng tử—và cách mỗi khung lý thuyết làm mới cách ta nhìn thực tại. Sách bàn về mũi tên thời gian, chân trời sự kiện và khả năng đa vũ trụ, luôn gắn với ý nghĩa đối với người quan sát bình thường. Giọng văn vừa uyên bác vừa gần gũi, sử dụng phép so sánh và thí nghiệm tư tưởng để làm rõ khái niệm trừu tượng. Đây không phải giáo trình kỹ thuật, mà là lời mời suy ngẫm về việc vũ trụ tồn tại ra sao và con người đã tiến xa thế nào trong việc hiểu nó. Với nhiều độc giả, cuốn sách là cửa sổ đầu tiên vào vũ trụ học và một lời nhắc rằng câu hỏi khoa học cũng là câu hỏi triết học.`
                }
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
                descriptionI18n: {
                    en: `Sapiens offers a sweeping history of Homo sapiens, from small hunter-gatherer bands to globalized civilization. Yuval Noah Harari argues that humans became dominant not because of physical strength but because of our ability to create shared stories—religions, nations, money, and ideologies—that enable large-scale cooperation. The book moves through the Cognitive Revolution, the Agricultural Revolution, and the Scientific Revolution, showing how each transformed social structures, economies, and belief systems. Harari connects anthropology with economics and politics, challenging common assumptions about progress and happiness. He asks whether agriculture truly improved human life, how empires spread ideas and violence, and why capitalism relies on trust in the future. The tone is provocative but accessible, inviting readers to examine the myths that shape modern life. Sapiens does not present a single moral conclusion; instead, it frames history as a series of trade-offs and unintended consequences. It is an engaging, big-picture narrative that encourages readers to question how we became who we are—and where we might be heading next.`,
                    vi: `Sapiens kể một lịch sử rộng lớn về Homo sapiens, từ những nhóm săn bắt-hái lượm nhỏ bé đến nền văn minh toàn cầu. Yuval Noah Harari cho rằng con người thống trị không phải vì sức mạnh thể chất mà vì khả năng tạo ra những câu chuyện chung—tôn giáo, quốc gia, tiền tệ, ý thức hệ—giúp hợp tác ở quy mô lớn. Sách đi qua Cách mạng Nhận thức, Cách mạng Nông nghiệp và Cách mạng Khoa học, cho thấy mỗi bước ngoặt đã biến đổi xã hội, kinh tế và hệ thống niềm tin như thế nào. Harari kết nối nhân học với kinh tế và chính trị, đặt câu hỏi về khái niệm tiến bộ và hạnh phúc. Ông phân tích nông nghiệp có thật sự cải thiện đời sống hay không, đế chế lan tỏa ý tưởng và bạo lực ra sao, và vì sao chủ nghĩa tư bản dựa trên niềm tin vào tương lai. Giọng điệu khiêu khích nhưng dễ tiếp cận, khuyến khích người đọc xem lại những “huyền thoại” đang định hình hiện tại. Sapiens không đưa ra kết luận đạo đức duy nhất, mà xem lịch sử là chuỗi đánh đổi và hệ quả ngoài ý muốn.`
                }
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
                descriptionI18n: {
                    en: `Cosmos is Carl Sagan's grand tour of the universe, combining astronomy, history of science, and philosophy into a single narrative. He traces how humans have learned to read the sky—from ancient civilizations to the space age—linking discoveries to the cultures and individuals who made them possible. Along the way, Sagan explains the scientific method, the scale of cosmic time, and the delicate conditions that make life on Earth possible. He balances awe with skepticism, emphasizing how evidence-based thinking protects us from superstition and error. The book celebrates exploration while reminding us of our planet's fragility, urging a sense of stewardship for the “pale blue dot.” Sagan's prose is lyrical but precise, making complex ideas feel intimate and urgent. Cosmos is not only about stars and galaxies; it is also about curiosity, humility, and the human drive to understand. It remains a landmark of popular science for its ability to inspire wonder and intellectual responsibility at the same time.`,
                    vi: `Cosmos là chuyến du hành vĩ đại qua vũ trụ của Carl Sagan, kết hợp thiên văn học, lịch sử khoa học và triết học trong một câu chuyện thống nhất. Ông kể lại cách con người học đọc bầu trời—từ các nền văn minh cổ đại đến kỷ nguyên không gian—và kết nối các khám phá với những con người, nền văn hóa đứng sau chúng. Trên hành trình, Sagan giải thích phương pháp khoa học, thang thời gian vũ trụ và những điều kiện mong manh khiến sự sống trên Trái Đất tồn tại. Ông cân bằng sự kinh ngạc với thái độ hoài nghi, nhấn mạnh tư duy dựa trên bằng chứng giúp chúng ta tránh mê tín và sai lầm. Cuốn sách tôn vinh khám phá nhưng đồng thời nhắc nhở về sự mong manh của “chấm xanh nhạt,” kêu gọi trách nhiệm với hành tinh. Văn phong của Sagan trữ tình nhưng chính xác, khiến ý tưởng phức tạp trở nên gần gũi. Cosmos không chỉ nói về sao và thiên hà, mà còn về tò mò, khiêm nhường và khát vọng hiểu biết của loài người.`
                }
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
                descriptionI18n: {
                    en: `The Selfish Gene reframes evolution by focusing on genes as the primary units of natural selection. Richard Dawkins argues that organisms are “survival machines” built to propagate genes, a perspective that explains many puzzling behaviors in nature. He explores altruism, kin selection, and cooperation, showing how apparently selfless acts can arise from genetic incentives. The book introduces enduring concepts such as the “replicator,” the “vehicle,” and the idea of memes as cultural analogs to genes. Dawkins writes with clarity and boldness, using vivid examples from biology to challenge intuitive assumptions about evolution. While the title is provocative, the argument is nuanced: “selfish” genes can produce cooperative, even compassionate outcomes at the level of organisms. The work sparked debate but also reshaped popular understanding of evolutionary theory. For readers, it offers a rigorous yet accessible lens on why living things behave as they do and how complexity emerges from simple evolutionary rules.`,
                    vi: `The Selfish Gene nhìn tiến hóa từ góc độ gen như đơn vị cơ bản của chọn lọc tự nhiên. Richard Dawkins lập luận rằng sinh vật là những “cỗ máy sinh tồn” nhằm nhân bản gen, một góc nhìn giúp giải thích nhiều hành vi tưởng như khó hiểu trong tự nhiên. Ông phân tích vị tha, chọn lọc họ hàng và hợp tác, cho thấy những hành động có vẻ “hy sinh” vẫn có thể xuất phát từ lợi ích di truyền. Sách giới thiệu các khái niệm bền vững như “bộ sao chép” (replicator), “phương tiện” (vehicle) và meme như tương tự văn hóa của gen. Dawkins viết rõ ràng, táo bạo, dùng ví dụ sinh học sinh động để thách thức trực giác về tiến hóa. Dù tiêu đề gây tranh cãi, lập luận khá tinh tế: gen “ích kỷ” có thể tạo ra những kết quả hợp tác ở cấp độ sinh vật. Tác phẩm vừa khơi gợi tranh luận vừa định hình lại cách công chúng hiểu về tiến hóa, cung cấp một lăng kính mạnh mẽ để nhìn vào hành vi và sự phức tạp của sự sống.`
                }
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
                descriptionI18n: {
                    en: `What If? takes bizarre hypothetical questions and answers them with real science, careful estimation, and a lot of humor. Randall Munroe, creator of xkcd, explores scenarios like pitching a baseball at near-light speed or building a wall of sound across the United States, then calculates the consequences using physics, engineering, and math. The tone is playful, but the reasoning is rigorous; each answer demonstrates how to break a problem into manageable parts and test assumptions. Along the way, the reader learns about energy, orbital mechanics, atmospheric pressure, and other core concepts without feeling like they are in a textbook. The book celebrates curiosity and the joy of asking “stupid” questions seriously. Munroe's sketches and clear explanations make complex ideas approachable for non-specialists. The result is both entertainment and a lesson in scientific thinking: how to model reality, accept uncertainty, and still reach meaningful conclusions.`,
                    vi: `What If? nhận những câu hỏi giả định kỳ quặc và trả lời bằng khoa học thật, ước lượng cẩn thận và rất nhiều hài hước. Randall Munroe, tác giả xkcd, phân tích các tình huống như ném bóng với vận tốc gần ánh sáng hay dựng một “bức tường âm thanh” chạy ngang nước Mỹ, rồi tính toán hệ quả bằng vật lý, kỹ thuật và toán học. Giọng điệu vui nhộn nhưng lập luận nghiêm túc; mỗi câu trả lời cho thấy cách chia nhỏ vấn đề, kiểm tra giả định và ước lượng hợp lý. Người đọc học về năng lượng, cơ học quỹ đạo, áp suất khí quyển và nhiều khái niệm nền tảng mà không thấy nặng nề như giáo trình. Cuốn sách tôn vinh sự tò mò và niềm vui của việc đặt câu hỏi “ngớ ngẩn” một cách nghiêm túc. Hình vẽ đơn giản và giải thích rõ ràng giúp ý tưởng phức tạp trở nên gần gũi. Kết quả là vừa giải trí vừa là bài học về tư duy khoa học: mô hình hóa thực tế, chấp nhận bất định và vẫn đi đến kết luận có ý nghĩa.`
                }
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
                descriptionI18n: {
                    en: `Educated is Tara Westover's memoir of growing up in a survivalist family in rural Idaho, where formal schooling and modern medicine were viewed with suspicion. She learns to read through the Bible and scrap work, then slowly realizes that knowledge can open doors her family forbids her to enter. Westover's journey from an isolated childhood to Cambridge University is not a simple escape story; it is a painful negotiation between loyalty and selfhood. She describes the contradictions of loving family members who can also be harmful, and the psychological cost of questioning the story you were raised to believe. The book explores how memory is shaped, contested, and sometimes weaponized, especially within closed communities. Westover's prose is clear and compassionate, detailing both the dangers she endured and the fierce intelligence that propelled her forward. Educated is about education not as a credential but as a transformation of perspective—learning to see oneself and the world differently. It is a powerful narrative of resilience, self-invention, and the complicated price of freedom.`,
                    vi: `Educated là hồi ký của Tara Westover về tuổi thơ trong gia đình theo chủ nghĩa sinh tồn ở vùng nông thôn Idaho, nơi trường học chính quy và y tế hiện đại bị nghi ngờ. Cô tự học đọc bằng Kinh Thánh và công việc lao động, rồi dần nhận ra tri thức có thể mở ra những cánh cửa mà gia đình không cho phép bước vào. Hành trình từ một tuổi thơ biệt lập tới Cambridge không phải câu chuyện “thoát khỏi” đơn giản; đó là cuộc thương lượng đau đớn giữa lòng trung thành và bản ngã. Westover kể về những mâu thuẫn khi yêu thương người thân nhưng đồng thời bị họ làm tổn thương, cùng cái giá tâm lý của việc đặt câu hỏi về câu chuyện mình được nuôi dạy. Cuốn sách khám phá cách ký ức được định hình, tranh chấp và đôi khi bị dùng làm vũ khí trong các cộng đồng khép kín. Văn phong trong sáng và giàu cảm thông, miêu tả cả nguy hiểm lẫn trí tuệ mạnh mẽ đã đưa cô tiến lên. Educated nói về giáo dục như một sự chuyển hóa góc nhìn, giúp con người thấy lại chính mình và thế giới.`
                }
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
                descriptionI18n: {
                    en: `Thinking, Fast and Slow distills decades of research into how humans make judgments and decisions. Daniel Kahneman describes two mental systems: System 1, which is fast, intuitive, and emotional; and System 2, which is slow, analytical, and effortful. Through experiments and anecdotes, he shows how cognitive biases—like anchoring, availability, and loss aversion—shape choices in finance, medicine, and everyday life. The book reveals that our confidence often exceeds our accuracy, and that intuition can be both powerful and misleading. Kahneman also explores the difference between the “experiencing self” and the “remembering self,” illustrating how memory affects happiness and preference. The writing is rigorous but accessible, making complex psychological findings feel concrete and practical. Rather than offering quick fixes, the book teaches awareness: recognizing when we are likely to misjudge and how to build better decision environments. It is foundational reading for anyone interested in psychology, behavioral economics, or making more deliberate choices under uncertainty.`,
                    vi: `Thinking, Fast and Slow chắt lọc nhiều thập kỷ nghiên cứu về cách con người phán đoán và ra quyết định. Daniel Kahneman mô tả hai hệ thống tư duy: Hệ 1 nhanh, trực giác và cảm xúc; Hệ 2 chậm, phân tích và cần nỗ lực. Qua thí nghiệm và câu chuyện, ông chỉ ra các thiên kiến nhận thức như neo điểm, sẵn có hay ác cảm mất mát ảnh hưởng đến lựa chọn trong tài chính, y khoa và đời sống thường ngày. Cuốn sách cho thấy sự tự tin của chúng ta thường vượt quá độ chính xác, và trực giác có thể vừa mạnh mẽ vừa sai lệch. Kahneman còn phân biệt “cái tôi trải nghiệm” và “cái tôi ghi nhớ,” giải thích vì sao ký ức định hình hạnh phúc và ưu tiên. Văn phong chặt chẽ nhưng dễ hiểu, biến kết quả tâm lý học thành bài học cụ thể. Sách không đưa ra mẹo vặt đơn giản; nó dạy sự tỉnh táo—nhận biết khi nào ta dễ sai và cách thiết kế môi trường quyết định tốt hơn. Đây là nền tảng cho ai quan tâm tâm lý, kinh tế học hành vi hoặc muốn ra quyết định sáng suốt trong bất định.`
                }
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
                descriptionI18n: {
                    en: `The Diary of a Young Girl is the intimate record of Anne Frank, a Jewish teenager hiding from Nazi persecution in an Amsterdam attic. Over two years, she writes about daily routines, cramped living conditions, hopes for the future, and the emotional turbulence of adolescence. Her voice moves between humor, frustration, curiosity, and fear, revealing a mind growing even as her world shrinks. The diary captures how ordinary moments—arguments, friendships, dreams—persist under extraordinary threat. It also shows Anne's evolving reflections on identity, prejudice, and the human capacity for both cruelty and kindness. The book offers a perspective on the Holocaust that statistics cannot convey: the inner life of a young person confronting danger and uncertainty. Anne's writing is perceptive and honest, and her ability to articulate complex feelings has made her diary a universal document of youth and resilience. The tragedy of her fate deepens the diary's impact, but its enduring power comes from the humanity she preserves on every page.`,
                    vi: `The Diary of a Young Girl là ghi chép thân mật của Anne Frank, cô bé Do Thái ẩn náu trong căn gác mái ở Amsterdam để trốn sự truy lùng của phát xít. Trong hơn hai năm, Anne viết về sinh hoạt thường ngày, không gian chật chội, những ước mơ tương lai và biến động cảm xúc tuổi thiếu niên. Giọng kể lúc hài hước, lúc bực bội, lúc tò mò và sợ hãi, cho thấy một tâm hồn lớn lên ngay khi thế giới xung quanh co lại. Cuốn nhật ký lưu lại cách những điều tưởng nhỏ—cãi vã, tình bạn, mơ ước—vẫn tồn tại giữa hiểm nguy. Anne suy ngẫm về bản sắc, định kiến và khả năng vừa tàn ác vừa nhân hậu của con người. Đây là góc nhìn về Holocaust mà con số không thể thay thế: đời sống nội tâm của một thiếu nữ đối diện bất trắc. Văn chương của Anne sáng suốt và chân thật, khiến nhật ký trở thành tài liệu phổ quát về tuổi trẻ và sự bền bỉ. Số phận bi kịch càng làm trang viết trở nên ám ảnh, nhưng sức mạnh lâu dài đến từ nhân tính mà cô lưu giữ trong từng dòng.`
                }
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
                descriptionI18n: {
                    en: `Guns, Germs, and Steel asks a sweeping question: why did some societies develop complex technologies and conquer others? Jared Diamond argues that geography and ecology—rather than cultural superiority—created unequal starting points. Regions with domesticable plants and animals produced food surpluses, which supported population growth, specialization, and state formation. Dense populations then fostered epidemic diseases that later devastated peoples without similar exposure. Diamond weaves evidence from archaeology, biology, linguistics, and history to build his case, explaining why Eurasia gained advantages in agriculture, metallurgy, and military power. The book challenges simplistic explanations of human history and emphasizes environmental constraints and opportunities. It is ambitious and provocative, inviting debate about determinism and the role of human agency. Readers encounter case studies from multiple continents, along with clear explanations of processes like the spread of crops, the diffusion of technology, and the evolution of pathogens. Whether or not one agrees with every conclusion, the book pushes readers to think globally and interdisciplinarily about how the modern world took shape.`,
                    vi: `Guns, Germs, and Steel đặt câu hỏi lớn: vì sao một số xã hội phát triển công nghệ phức tạp và chinh phục những xã hội khác? Jared Diamond lập luận rằng địa lý và sinh thái—chứ không phải sự “ưu việt văn hóa”—tạo ra điểm xuất phát không đồng đều. Những vùng có cây trồng và động vật dễ thuần hóa tạo ra thặng dư lương thực, hỗ trợ tăng dân số, chuyên môn hóa và hình thành nhà nước. Mật độ dân cư cao cũng tạo điều kiện cho dịch bệnh phát triển, khiến các cộng đồng chưa từng tiếp xúc bị tàn phá. Diamond kết hợp bằng chứng từ khảo cổ, sinh học, ngôn ngữ học và lịch sử để giải thích vì sao Âu-Á có lợi thế trong nông nghiệp, luyện kim và sức mạnh quân sự. Cuốn sách thách thức cách giải thích đơn giản về lịch sử nhân loại, nhấn mạnh các ràng buộc và cơ hội môi trường. Đây là tác phẩm tham vọng và gây tranh luận, buộc người đọc suy nghĩ về tính tất định và vai trò của con người. Những ví dụ từ nhiều châu lục cùng mô tả rõ về quá trình lan truyền cây trồng, công nghệ và mầm bệnh giúp bức tranh trở nên sống động. Dù có thể không đồng ý mọi kết luận, cuốn sách vẫn khuyến khích tư duy toàn cầu và liên ngành về việc thế giới hiện đại hình thành ra sao.`
                }
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
                descriptionI18n: {
                    en: `Into the Wild reconstructs the life and death of Christopher McCandless, a young man who abandoned possessions, took the name “Alexander Supertramp,” and wandered North America before heading into the Alaskan wilderness. Jon Krakauer blends investigative reporting with personal reflection, piecing together McCandless's motivations through letters, interviews, and his own journals. The book explores the tension between idealism and recklessness, freedom and isolation, as McCandless searches for authenticity outside modern society. Krakauer situates the story within a tradition of American wilderness seekers, comparing McCandless to earlier adventurers and writers. The narrative raises difficult questions about responsibility, romanticizing risk, and the limits of self-reliance. It is both a gripping survival tale and a psychological portrait of a young man driven by powerful ideals. The book's impact lies in its ambiguity: readers are invited to debate whether McCandless was a visionary or tragically naive. Into the Wild remains a compelling exploration of why people are drawn to the edge of society—and what that pursuit can cost.`,
                    vi: `Into the Wild tái dựng cuộc đời và cái chết của Christopher McCandless, người trẻ bỏ lại tài sản, lấy tên “Alexander Supertramp” và lang thang khắp Bắc Mỹ trước khi đi vào hoang dã Alaska. Jon Krakauer kết hợp điều tra báo chí với suy tư cá nhân, ghép lại động cơ của McCandless qua thư từ, phỏng vấn và nhật ký. Cuốn sách khám phá sự căng thẳng giữa lý tưởng và liều lĩnh, tự do và cô lập, khi McCandless tìm kiếm tính chân thật ngoài xã hội hiện đại. Krakauer đặt câu chuyện trong truyền thống những người tìm kiếm hoang dã của Mỹ, so sánh McCandless với các nhà phiêu lưu và nhà văn trước đó. Câu chuyện đặt ra những câu hỏi khó về trách nhiệm, sự lãng mạn hóa rủi ro và giới hạn của tự lực. Đây vừa là câu chuyện sinh tồn hấp dẫn vừa là chân dung tâm lý về một người trẻ bị thôi thúc bởi lý tưởng mạnh mẽ. Sức mạnh của sách nằm ở sự mơ hồ: độc giả được mời tranh luận liệu McCandless là kẻ mơ mộng hay ngây thơ bi kịch. Into the Wild là khảo sát cuốn hút về lý do con người tìm đến rìa xã hội và cái giá của hành trình ấy.`
                }
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
                descriptionI18n: {
                    en: `Atomic Habits explains how small, consistent behaviors compound into remarkable results. James Clear frames habit change around four stages—cue, craving, response, and reward—and shows how to redesign each stage to make good habits easier and bad habits harder. He emphasizes identity-based change: you become the kind of person who does the habit, not just someone chasing outcomes. The book is practical and structured, offering tactics like habit stacking, environment design, and tracking to make progress visible. Clear uses stories and research to illustrate how systems matter more than motivation and how tiny improvements build a long-term advantage. Rather than relying on willpower, he teaches readers to shape their surroundings and routines so success becomes the default. The approach is flexible and scalable, whether you are training for a marathon, building a writing practice, or improving health. Atomic Habits is compelling because it is actionable: each chapter ends with clear takeaways and questions. It's a guide for anyone who wants to build durable habits through small, repeatable wins.`,
                    vi: `Atomic Habits giải thích cách những hành vi nhỏ, lặp lại đều đặn có thể tạo ra kết quả lớn. James Clear mô tả bốn giai đoạn của thói quen—tín hiệu, khao khát, phản ứng và phần thưởng—rồi hướng dẫn cách thiết kế lại từng bước để thói quen tốt dễ thực hiện và thói quen xấu khó xảy ra. Ông nhấn mạnh thay đổi dựa trên bản sắc: trở thành kiểu người thực hiện thói quen, chứ không chỉ theo đuổi kết quả. Sách rất thực tế, cung cấp chiến lược như ghép thói quen, thiết kế môi trường và theo dõi tiến trình để tạo động lực. Clear dùng câu chuyện và nghiên cứu để chứng minh hệ thống quan trọng hơn động lực nhất thời, và những cải thiện nhỏ tích lũy thành lợi thế dài hạn. Thay vì dựa vào ý chí, bạn học cách sắp xếp môi trường và lịch trình để thành công trở thành mặc định. Đây là cuốn sách hành động, mỗi chương đều có gợi ý cụ thể, phù hợp cho ai muốn xây dựng thói quen bền vững bằng những bước nhỏ.`
                }
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
                descriptionI18n: {
                    en: `The Power of Now centers on a simple idea: lasting peace arises from being fully present. Eckhart Tolle argues that the mind often lives in the past or future, creating anxiety, regret, and ego-driven identity. Through dialogues and short reflections, he invites readers to observe thoughts without becoming trapped by them. The book blends spiritual traditions with practical guidance, encouraging awareness of the body, breath, and immediate experience. Tolle describes how the “pain-body” accumulates unresolved emotion and how presence can dissolve its grip. Rather than offering quick fixes, the book emphasizes a shift in consciousness—recognizing that you are not your thoughts. The writing is calm and direct, making meditative concepts approachable for everyday readers. For many, it functions as a manual for mindfulness and a critique of the restless, achievement-focused mindset. The Power of Now is best read slowly, as an invitation to practice attention and discover freedom in the present moment.`,
                    vi: `The Power of Now xoay quanh một ý tưởng cốt lõi: bình an bền vững đến từ sự hiện diện trọn vẹn. Eckhart Tolle cho rằng tâm trí thường mắc kẹt trong quá khứ hoặc tương lai, tạo ra lo âu, hối tiếc và cái tôi giả định. Qua các đoạn đối thoại và suy niệm ngắn, ông mời người đọc quan sát dòng suy nghĩ mà không bị cuốn theo. Cuốn sách kết hợp truyền thống tâm linh với hướng dẫn thực hành, nhấn mạnh nhận biết cơ thể, hơi thở và trải nghiệm tức thời. Tolle nói về “thân thể đau khổ” tích tụ cảm xúc chưa giải tỏa và cách sự hiện diện có thể làm tan sức nặng ấy. Thay vì mẹo nhanh, sách hướng tới chuyển hóa nhận thức—nhận ra rằng bạn không đồng nhất với suy nghĩ. Giọng văn bình tĩnh và trực diện khiến khái niệm thiền định trở nên gần gũi. Với nhiều người, đây vừa là cẩm nang chánh niệm vừa là lời phê phán lối sống bồn chồn chạy theo thành tựu. The Power of Now nên được đọc chậm, như một lời mời luyện tập sự chú ý và tìm tự do trong hiện tại.`
                }
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
                descriptionI18n: {
                    en: `The 7 Habits of Highly Effective People presents a principle-centered framework for personal and professional growth. Stephen R. Covey organizes the habits into a progression: from private victory (self-mastery and proactive responsibility) to public victory (collaboration and leadership), and finally renewal (continuous improvement). He emphasizes character over tactics, encouraging readers to align actions with long-term values rather than short-term fixes. The habits cover goal clarity, prioritization, win-win thinking, empathic communication, and synergistic teamwork. Covey uses stories, models, and exercises to make the concepts practical and memorable. The book's influence comes from its focus on integrity and durability—skills meant to last across careers and life stages. It is part leadership manual, part self-development guide, and part philosophy of effectiveness. For readers willing to reflect and practice, the habits provide a structured way to improve decision-making, relationships, and purpose.`,
                    vi: `The 7 Habits of Highly Effective People đưa ra khuôn khổ hiệu quả dựa trên nguyên tắc cho phát triển cá nhân và nghề nghiệp. Stephen R. Covey sắp xếp bảy thói quen theo tiến trình: từ “chiến thắng cá nhân” (tự chủ và trách nhiệm) đến “chiến thắng công cộng” (hợp tác và lãnh đạo), rồi “tái tạo” (cải tiến liên tục). Ông nhấn mạnh nhân cách hơn chiến thuật, khuyến khích hành động phù hợp giá trị dài hạn thay vì giải pháp ngắn hạn. Các thói quen bao gồm xác định mục tiêu, ưu tiên, tư duy đôi bên cùng thắng, giao tiếp thấu cảm và phối hợp tạo sức mạnh tổng hợp. Covey dùng câu chuyện, mô hình và bài tập để biến khái niệm thành thực hành dễ nhớ. Sức ảnh hưởng của sách đến từ trọng tâm về tính liêm chính và bền vững—kỹ năng có thể áp dụng qua nhiều giai đoạn cuộc đời. Đây vừa là cẩm nang lãnh đạo, vừa là hướng dẫn phát triển bản thân, vừa là triết lý về hiệu quả. Với người sẵn sàng suy ngẫm và luyện tập, bảy thói quen tạo ra lộ trình rõ ràng để cải thiện quyết định, quan hệ và mục đích sống.`
                }
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
                descriptionI18n: {
                    en: `How to Win Friends and Influence People distills practical principles for building strong relationships. Dale Carnegie argues that influence is rooted in respect: listening sincerely, appreciating others, and avoiding needless criticism. He offers concrete guidelines—remember names, ask questions, praise honestly, and let people feel ownership of ideas. The advice is simple but effective because it is grounded in empathy rather than manipulation. Carnegie illustrates each principle with stories from business, politics, and everyday life, making the lessons feel timeless. The book also addresses conflict, showing how to disagree without creating enemies and how to persuade by appealing to shared values. While the examples reflect its era, the core psychology remains relevant in modern workplaces and social settings. Readers who apply the principles often find improvements in communication, leadership, and collaboration. The book's durability comes from its focus on human needs: recognition, dignity, and the desire to be understood.`,
                    vi: `How to Win Friends and Influence People đúc kết các nguyên tắc thực hành để xây dựng quan hệ bền vững. Dale Carnegie cho rằng ảnh hưởng bắt nguồn từ sự tôn trọng: lắng nghe chân thành, trân trọng người khác và tránh chỉ trích không cần thiết. Ông đưa ra những hướng dẫn cụ thể—ghi nhớ tên, đặt câu hỏi, khen ngợi trung thực và giúp người khác cảm thấy ý tưởng là của họ. Lời khuyên đơn giản nhưng hiệu quả vì dựa trên sự đồng cảm chứ không phải thao túng. Carnegie minh họa bằng các câu chuyện trong kinh doanh, chính trị và đời sống, khiến bài học trở nên vượt thời gian. Sách cũng bàn về xung đột, hướng dẫn cách bất đồng mà không tạo ra kẻ thù và cách thuyết phục bằng giá trị chung. Dù ví dụ mang màu sắc thời đại, tâm lý cốt lõi vẫn phù hợp với môi trường hiện đại. Người đọc áp dụng sẽ thấy cải thiện trong giao tiếp, lãnh đạo và hợp tác. Độ bền của cuốn sách đến từ việc tập trung vào nhu cầu con người: được công nhận, được tôn trọng và được thấu hiểu.`
                }
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
                descriptionI18n: {
                    en: `Deep Work argues that the ability to focus without distraction is becoming rare and therefore increasingly valuable. Cal Newport contrasts deep work—intense, cognitively demanding concentration—with shallow work, which is reactive, fragmented, and easily outsourced. He shows how modern workplaces often reward visible busyness while undermining true productivity. The book offers strategies to protect focus: time blocking, rituals, quitting social media, and making shallow tasks explicit and limited. Newport supports his case with research on attention and examples from high-performing professionals. The goal is not only higher output but higher quality, achieved by training the mind to sustain effort. He frames deep work as a skill that can be developed, not just a personality trait. The book also addresses meaning, suggesting that deep engagement produces a sense of satisfaction and craftsmanship. For students and knowledge workers, Deep Work provides a practical blueprint to reclaim attention and create work that matters.`,
                    vi: `Deep Work cho rằng khả năng tập trung sâu, không bị xao nhãng đang trở nên hiếm và vì thế ngày càng có giá trị. Cal Newport đối lập “làm việc sâu”—tập trung cao độ, đòi hỏi nhận thức—với “làm việc nông,” vốn phản ứng, vụn vặt và dễ bị thay thế. Ông chỉ ra môi trường hiện đại thường thưởng cho sự bận rộn dễ thấy nhưng lại làm suy giảm năng suất thật. Cuốn sách đưa ra chiến lược bảo vệ sự tập trung: chia thời gian theo khối, tạo nghi thức, cắt giảm mạng xã hội và giới hạn rõ ràng các việc hời hợt. Newport dùng nghiên cứu về chú ý và ví dụ của người làm việc hiệu suất cao để củng cố lập luận. Mục tiêu không chỉ là làm nhiều hơn mà là làm tốt hơn, bằng cách rèn luyện khả năng duy trì nỗ lực trí tuệ. Ông xem làm việc sâu như một kỹ năng có thể luyện tập, không chỉ là tính cách. Sách cũng gắn với ý nghĩa, cho rằng sự đắm chìm mang lại cảm giác nghề thủ công và thỏa mãn. Với học sinh, sinh viên và người làm việc tri thức, Deep Work là bản thiết kế thực dụng để giành lại sự tập trung và tạo ra công việc giá trị.`
                }
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
                descriptionI18n: {
                    en: `The Da Vinci Code follows Harvard symbologist Robert Langdon after a murder at the Louvre reveals a trail of cryptic clues hidden in art, symbols, and history. With French cryptologist Sophie Neveu, he races across Paris and beyond to solve puzzles tied to secret societies and religious mysteries. Dan Brown mixes real landmarks with fiction, keeping the pace brisk through short chapters and cliffhangers. The story explores themes of faith, institutional power, and the fragility of historical narratives, asking who controls sacred stories and why. As Langdon and Sophie unravel codes, they also uncover personal histories and buried family secrets. The novel is designed as a high-speed chase, with twists that keep readers guessing. Its blend of art history, conspiracy, and puzzle-solving makes it both escapist and provocative. While controversial for its speculative claims, the book remains a landmark of popular thrillers and a gateway to readers who love mysteries rooted in symbols and hidden meanings.`,
                    vi: `The Da Vinci Code theo chân nhà ký hiệu học Robert Langdon sau vụ án mạng tại Louvre, nơi các manh mối được giấu trong nghệ thuật, biểu tượng và lịch sử. Cùng nhà mật mã học Sophie Neveu, anh lao qua Paris và nhiều địa điểm khác để giải các câu đố liên quan đến hội kín và bí ẩn tôn giáo. Dan Brown kết hợp địa danh có thật với hư cấu, tạo nhịp truyện dồn dập qua những chương ngắn và các cú treo lửng. Câu chuyện khai thác chủ đề đức tin, quyền lực của tổ chức và sự mong manh của những câu chuyện lịch sử: ai kiểm soát “sự thật thiêng liêng” và vì sao. Khi giải mã, Langdon và Sophie còn phát hiện những bí mật cá nhân và lịch sử gia đình bị chôn vùi. Tiểu thuyết được thiết kế như một cuộc rượt đuổi tốc độ cao, đầy ngoặt bất ngờ. Dù gây tranh cãi vì yếu tố suy đoán, nó vẫn là biểu tượng của dòng thriller đại chúng và hấp dẫn với người thích bí ẩn dựa trên ký hiệu và ý nghĩa ẩn giấu.`
                }
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
                descriptionI18n: {
                    en: `Gone Girl begins with the disappearance of Amy Dunne on her fifth wedding anniversary, immediately turning suspicion toward her husband, Nick. Through alternating perspectives—Nick's present-tense narration and Amy's diary—the novel peels back the surface of their marriage to reveal manipulation, resentment, and a hunger for control. Gillian Flynn constructs a psychological chess match in which perception is everything and the media amplifies every misstep. As the investigation unfolds, the story challenges assumptions about truth, narrative, and the performance of domestic happiness. The book's sharp dialogue and dark humor expose how couples curate images of themselves, and how those images can become weapons. The plot is famous for its twists, but its lasting impact comes from its insight into power dynamics and identity. Gone Girl is a thriller about marriage, but also a critique of the stories we tell to make ourselves legible to others. It's tense, cynical, and relentlessly clever.`,
                    vi: `Gone Girl mở đầu bằng việc Amy Dunne biến mất đúng dịp kỷ niệm cưới, khiến mọi nghi ngờ đổ dồn vào chồng cô, Nick. Câu chuyện xen kẽ hai góc nhìn—lời kể của Nick ở hiện tại và nhật ký của Amy—dần bóc trần bề mặt hôn nhân để lộ thao túng, hằn học và khát vọng kiểm soát. Gillian Flynn dựng nên một ván cờ tâm lý, nơi nhận thức quan trọng hơn sự thật, và truyền thông thổi phồng mọi sai lầm. Khi điều tra tiến triển, tác phẩm thách thức giả định về chân lý, câu chuyện và màn trình diễn của hạnh phúc gia đình. Đối thoại sắc và chất hài đen phơi bày cách các cặp đôi “trình diễn” bản thân, và cách hình ảnh đó có thể trở thành vũ khí. Gone Girl nổi tiếng bởi những cú ngoặt, nhưng sức nặng lâu dài đến từ việc soi sâu vào quyền lực và bản sắc trong quan hệ. Đây là thriller về hôn nhân, đồng thời là phê phán những câu chuyện ta kể để khiến mình dễ được hiểu.`
                }
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
                descriptionI18n: {
                    en: `The Girl with the Dragon Tattoo pairs journalist Mikael Blomkvist, disgraced after a libel case, with Lisbeth Salander, a brilliant and enigmatic hacker. Hired by an aging industrialist, they investigate the decades-old disappearance of a young woman from a powerful family. The inquiry unfolds into a labyrinth of secrets, abuse, and corporate corruption, linking past crimes to present danger. Stieg Larsson balances procedural detail with high-stakes suspense, while the relationship between Blomkvist and Salander adds emotional depth. Salander, in particular, is a striking character—socially isolated yet fiercely intelligent, shaped by trauma but driven by a strong moral compass. The novel is also a social critique of misogyny and institutional failure. Long and complex, it rewards patience with an intricate plot and escalating tension. As the first book in the Millennium series, it established a new standard for Nordic noir and remains a modern classic of crime fiction.`,
                    vi: `The Girl with the Dragon Tattoo ghép đôi nhà báo Mikael Blomkvist—vừa vướng kiện tụng phỉ báng—với Lisbeth Salander, một hacker thiên tài đầy bí ẩn. Họ được một ông trùm công nghiệp thuê điều tra vụ mất tích của một cô gái trẻ thuộc gia tộc quyền lực từ nhiều thập kỷ trước. Cuộc điều tra mở ra mê cung bí mật, lạm dụng và tham nhũng doanh nghiệp, nối kết tội ác quá khứ với hiểm họa hiện tại. Stieg Larsson cân bằng chi tiết điều tra với nhịp căng thẳng cao, trong khi mối quan hệ Blomkvist–Salander tạo chiều sâu cảm xúc. Salander là nhân vật nổi bật—cô lập xã hội nhưng cực kỳ thông minh, mang vết thương tâm lý và ý chí đạo đức mạnh mẽ. Tác phẩm còn là phê phán xã hội về misogyny và sự thất bại của các thể chế. Dài và phức tạp, truyện thưởng cho người đọc bằng cốt truyện đan cài và cao trào dồn dập. Đây là phần mở đầu của Millennium, đặt chuẩn mực mới cho Nordic noir và vẫn là tác phẩm tiêu biểu của trinh thám hiện đại.`
                }
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
                descriptionI18n: {
                    en: `The Silent Patient centers on Alicia Berenson, a celebrated painter who shoots her husband and then refuses to speak a single word. Her silence turns her into a mystery and a media obsession. Theo Faber, a psychotherapist, becomes determined to unlock her motive and is granted access to the secure facility where she is held. As he digs into Alicia's past, the investigation grows increasingly personal, blurring the line between clinician and participant. The novel explores trauma, memory, and the narratives people construct to survive unbearable events. Written with a tight pace and a claustrophobic atmosphere, it layers therapy sessions, diary fragments, and revelations that steadily shift the reader's understanding. The final twist is famous, but the book's appeal also lies in its portrait of obsession—how the desire to explain another person can become a mirror for one's own secrets. The Silent Patient is a sleek psychological thriller that plays with trust, perception, and the fragility of truth.`,
                    vi: `The Silent Patient xoay quanh Alicia Berenson, nữ họa sĩ nổi tiếng bắn chồng rồi im lặng tuyệt đối. Sự im lặng ấy biến cô thành bí ẩn và đối tượng ám ảnh của truyền thông. Nhà trị liệu tâm lý Theo Faber quyết tâm mở khóa động cơ và được phép tiếp cận cơ sở an ninh nơi Alicia bị giam giữ. Khi đào sâu quá khứ của Alicia, cuộc điều tra ngày càng trở nên cá nhân, làm mờ ranh giới giữa bác sĩ và người tham dự. Tiểu thuyết khai thác chấn thương, ký ức và những câu chuyện con người tự dựng để sống sót. Nhịp kể chặt chẽ, không khí ngột ngạt, xen kẽ các buổi trị liệu, đoạn nhật ký và các hé lộ khiến nhận thức của người đọc liên tục thay đổi. Cú twist cuối nổi tiếng, nhưng sức hút còn ở chân dung về sự ám ảnh—khi khao khát lý giải người khác trở thành tấm gương phản chiếu chính bí mật của mình. The Silent Patient là thriller tâm lý gọn gàng, chơi với niềm tin, nhận thức và sự mong manh của sự thật.`
                }
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
                descriptionI18n: {
                    en: `And Then There Were None is Agatha Christie's most ingenious locked-room mystery. Ten strangers arrive on an isolated island, each invited under mysterious circumstances. A recorded message accuses them of past crimes, and soon they begin to die one by one in ways that mirror a sinister nursery rhyme. With no way to leave and no clear suspect, paranoia takes over as trust collapses. Christie orchestrates the tension with ruthless efficiency, stripping away alibis and forcing each character to confront guilt, fear, and moral responsibility. The novel's structure is a study in escalation: the narrowing cast, the rising dread, and the sense of inevitability. It explores justice outside the law and the psychological weight of hidden wrongdoing. The mystery is famously airtight, and the final reveal remains one of Christie's most celebrated twists. Even after nearly a century, the book's pacing and suspense still feel modern. It is a benchmark for crime fiction and a masterclass in plotting.`,
                    vi: `And Then There Were None là tác phẩm trinh thám “khóa kín” xuất sắc nhất của Agatha Christie. Mười người xa lạ đến một hòn đảo biệt lập, mỗi người được mời vì một lý do bí ẩn. Một bản ghi âm tố cáo họ đã gây tội trong quá khứ, rồi lần lượt từng người chết theo một vần đồng dao rùng rợn. Không thể rời đảo, không rõ hung thủ, nỗi hoang mang lan rộng khi niềm tin sụp đổ. Christie điều khiển căng thẳng với độ chính xác tàn nhẫn, liên tục loại bỏ ngoại phạm và buộc từng nhân vật đối diện với tội lỗi và sợ hãi. Cấu trúc truyện là bài học về sự leo thang: dàn nhân vật thu hẹp, nỗi lo tăng dần và cảm giác tất yếu bao trùm. Tác phẩm đặt câu hỏi về công lý ngoài vòng pháp luật và gánh nặng tâm lý của lỗi lầm giấu kín. Bí ẩn được dựng rất kín kẽ, và cú lật cuối là một trong những tiết lộ nổi tiếng nhất của Christie. Dù đã gần một thế kỷ, nhịp kể và độ căng vẫn rất hiện đại. Đây là chuẩn mực của truyện tội phạm và là bài học bậc thầy về dựng cốt truyện.`
                }
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
                descriptionI18n: {
                    en: `The Notebook frames a lifelong romance through the memories of Noah Calhoun, who recounts a summer love with Allie Nelson and the years that follow. Their relationship begins with youthful intensity, is disrupted by class expectations and separation, and is later tested by the realities of adulthood. The novel unfolds in a gentle, reflective tone, emphasizing devotion, patience, and the ways memory shapes identity. As the story moves between past and present, it reveals the quiet sacrifices that sustain love over decades. Nicholas Sparks writes with emotional clarity, building a narrative that is both intimate and sentimental without losing sight of hardship. The book also touches on themes of aging and illness, adding poignancy to the romance. While it is a classic tearjerker, it resonates because it treats love as a series of choices rather than a single dramatic moment. The Notebook remains a popular modern romance for readers who want a heartfelt, enduring story.`,
                    vi: `The Notebook kể lại câu chuyện tình dài lâu qua ký ức của Noah Calhoun, người nhớ về mối tình mùa hè với Allie Nelson và những năm tháng sau đó. Tình yêu của họ bắt đầu mãnh liệt, bị gián đoạn bởi khác biệt giai cấp và sự xa cách, rồi lại được thử thách bởi thực tế trưởng thành. Tiểu thuyết có giọng điệu dịu dàng, hồi tưởng, nhấn mạnh sự tận tụy, kiên nhẫn và cách ký ức định hình con người. Khi dòng thời gian chuyển giữa quá khứ và hiện tại, người đọc thấy những hy sinh thầm lặng giúp tình yêu bền vững qua nhiều thập kỷ. Nicholas Sparks viết rõ ràng và cảm xúc, tạo nên câu chuyện vừa thân mật vừa đầy rung động nhưng không né tránh khó khăn. Tác phẩm chạm tới cả vấn đề tuổi già và bệnh tật, khiến mối tình thêm phần xót xa. Dù là câu chuyện “lấy nước mắt,” sức hấp dẫn đến từ việc xem tình yêu như chuỗi lựa chọn bền bỉ hơn là khoảnh khắc bùng nổ. The Notebook vẫn là romance hiện đại được yêu thích cho ai tìm kiếm một chuyện tình sâu lắng và lâu dài.`
                }
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
                descriptionI18n: {
                    en: `Me Before You follows Louisa Clark, a quirky young woman who takes a job caring for Will Traynor, a former high-powered professional left quadriplegic after an accident. Their relationship begins with tension and evolves into a bond that is tender, challenging, and transformative for both. Louisa introduces Will to small joys and possibilities; Will forces Louisa to confront her fear of risk and change. The novel explores love alongside difficult questions about autonomy, dignity, and what it means to live a full life. Jojo Moyes balances humor with heartbreak, creating characters who feel flawed yet deeply human. The story resists easy answers, asking readers to weigh compassion against personal freedom. It is a romance with emotional depth, grounded in real-world stakes rather than fantasy. Me Before You became a bestseller because it combines warmth, wit, and a willingness to engage with moral complexity.`,
                    vi: `Me Before You kể về Louisa Clark, cô gái trẻ lập dị nhận công việc chăm sóc Will Traynor—một người từng thành đạt, nay bị liệt sau tai nạn. Mối quan hệ của họ bắt đầu căng thẳng rồi dần chuyển thành gắn bó vừa dịu dàng vừa thử thách, thay đổi cả hai. Louisa giúp Will tìm lại niềm vui nhỏ bé; Will buộc Louisa đối mặt với nỗi sợ rủi ro và sự thay đổi. Tiểu thuyết đặt tình yêu bên cạnh những câu hỏi khó về quyền tự chủ, phẩm giá và thế nào là sống trọn vẹn. Jojo Moyes cân bằng hài hước với nỗi đau, tạo nhân vật có khuyết điểm nhưng chân thật. Câu chuyện không đưa ra đáp án dễ dàng, buộc người đọc cân nhắc giữa lòng trắc ẩn và tự do cá nhân. Đây là romance có chiều sâu, dựa trên những “cái giá” rất thật chứ không phải mơ mộng. Me Before You trở thành bestseller vì sự ấm áp, dí dỏm và dám chạm vào phức tạp đạo đức.`
                }
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
                descriptionI18n: {
                    en: `Outlander blends historical adventure with romance through the story of Claire Randall, a World War II nurse who is mysteriously transported from 1940s Scotland to the eighteenth century. Thrust into a volatile landscape of clan politics and looming rebellion, Claire must navigate danger while hiding her origins. She meets Jamie Fraser, a Highland warrior, and their relationship grows from necessity to deep affection. Diana Gabaldon layers the narrative with rich historical detail, exploring medicine, war, and cultural conflict. The time-travel premise adds tension as Claire grapples with loyalty to her husband in the twentieth century and her evolving life in the past. The novel balances sweeping action with intimate emotional stakes, making it both an epic adventure and a love story. Themes of identity, survival, and choice run throughout the long, immersive narrative. Outlander launches a series known for its scale and emotional intensity, appealing to readers who want romance with high stakes and historical texture.`,
                    vi: `Outlander kết hợp phiêu lưu lịch sử với tình yêu qua câu chuyện của Claire Randall, y tá thời Thế chiến II bất ngờ bị đưa từ Scotland thập niên 1940 về thế kỷ 18. Giữa bối cảnh chính trị hỗn loạn và nguy cơ nổi dậy, Claire phải sinh tồn và giấu kín thân phận. Cô gặp Jamie Fraser, chiến binh Highland, và mối quan hệ của họ phát triển từ sự cần thiết thành tình cảm sâu sắc. Diana Gabaldon xây dựng lớp nền lịch sử dày dặn, khai thác y học, chiến tranh và xung đột văn hóa. Yếu tố du hành thời gian tạo thêm căng thẳng khi Claire giằng co giữa lòng trung thành với người chồng ở thế kỷ 20 và cuộc sống mới ở quá khứ. Tiểu thuyết cân bằng hành động hoành tráng với cảm xúc riêng tư, vừa là sử thi phiêu lưu vừa là chuyện tình. Chủ đề bản sắc, sinh tồn và lựa chọn xuyên suốt một câu chuyện dài và cuốn hút. Outlander mở đầu cho series nổi tiếng vì quy mô và cường độ cảm xúc, phù hợp với người đọc muốn romance có “độ nặng” và bối cảnh lịch sử phong phú.`
                }
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
                descriptionI18n: {
                    en: `The Hating Game is a modern workplace romantic comedy built on sharp banter and slow-burn tension. Lucy and Joshua are executive assistants who sit across from each other and compete over everything—from stapler placement to promotions. Their rivalry becomes a daily game of one-upmanship, but attraction begins to complicate their carefully maintained hostility. Sally Thorne captures the awkwardness and thrill of realizing that a nemesis might also be a partner. The story explores ambition, vulnerability, and the messy ways people protect themselves at work. It balances playful humor with emotional sincerity, and the chemistry between the leads drives the plot. The book is fast-paced and full of witty dialogue, delivering the satisfying arc expected of a rom-com while still giving the characters depth. Readers who enjoy enemies-to-lovers dynamics and workplace settings will find it addictive and charming.`,
                    vi: `The Hating Game là rom-com công sở hiện đại với đối đáp sắc bén và căng thẳng tăng dần. Lucy và Joshua là trợ lý điều hành ngồi đối diện nhau, cạnh tranh từ chuyện nhỏ như cái dập ghim đến chuyện lớn như thăng chức. Cuộc đối đầu hằng ngày trở thành trò hơn thua, nhưng sự hấp dẫn dần làm rối loạn “thù địch” vốn có. Sally Thorne bắt được cảm giác vừa bối rối vừa hồi hộp khi nhận ra kẻ đối đầu có thể là người mình cần. Câu chuyện khai thác tham vọng, sự dễ tổn thương và cách con người tự phòng vệ nơi công sở. Tác phẩm cân bằng hài hước với cảm xúc chân thành, và phản ứng hóa học giữa hai nhân vật là động lực chính. Nhịp truyện nhanh, lời thoại thông minh, mang lại kết cấu thỏa mãn kiểu rom-com mà vẫn có chiều sâu nhân vật. Ai thích motif “kẻ thù thành người yêu” và bối cảnh công sở sẽ thấy cuốn sách vừa vui vừa cuốn.`
                }
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
                descriptionI18n: {
                    en: `It Ends with Us follows Lily Bloom as she navigates a complicated relationship that forces her to confront painful patterns from her past. As her romance with the charismatic Ryle deepens, old wounds resurface and she must decide what love should and should not require. The novel balances tenderness with a frank depiction of abuse, showing how cycles of harm can be difficult to recognize and even harder to break. Through flashbacks and present-day choices, Lily's story becomes one of resilience, boundaries, and self-worth. Colleen Hoover writes with emotional intensity, inviting empathy for flawed characters while refusing to excuse harmful behavior. The book sparked wide conversation because it portrays a messy reality rather than a romantic ideal, asking readers to consider the difference between devotion and self-erasure. It is a love story, but also a story about choosing a healthier future. The ending is bittersweet yet hopeful, emphasizing the courage it takes to stop repeating a destructive pattern.`,
                    vi: `It Ends with Us theo chân Lily Bloom khi cô bước vào một mối quan hệ phức tạp, buộc phải đối diện những vết thương từ quá khứ. Khi tình cảm với Ryle ngày càng sâu sắc, những ký ức cũ trỗi dậy và Lily phải tự hỏi tình yêu có thể và không thể đòi hỏi điều gì. Tiểu thuyết cân bằng sự dịu dàng với mô tả thẳng thắn về bạo lực, cho thấy vòng lặp tổn thương đôi khi khó nhận ra và càng khó phá vỡ. Qua các đoạn hồi tưởng và lựa chọn hiện tại, câu chuyện trở thành hành trình về sức bền, ranh giới và giá trị bản thân. Colleen Hoover viết đầy cảm xúc, tạo sự đồng cảm cho nhân vật nhưng không biện minh cho hành vi gây hại. Cuốn sách gây tranh luận vì phản ánh một thực tế phức tạp hơn là lý tưởng lãng mạn, buộc người đọc phân biệt giữa tận tụy và đánh mất bản thân. Đây vừa là chuyện tình yêu vừa là câu chuyện lựa chọn tương lai lành mạnh hơn. Kết thúc vừa buồn vừa hy vọng, nhấn mạnh sự can đảm cần có để chấm dứt một vòng lặp hủy hoại.`
                }
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
                descriptionI18n: {
                    en: `Walter Isaacson's biography of Steve Jobs draws on extensive interviews with Jobs, colleagues, friends, and family to paint a complex portrait. The book traces Jobs's early years, his partnership with Steve Wozniak, the rise of Apple, his ouster, and his return to lead the company's renaissance. It covers the creation of iconic products like the Macintosh, iPod, iPhone, and iPad, highlighting the fusion of technology and design that defined Apple's culture. Isaacson does not shy away from Jobs's difficult personality—his intensity, perfectionism, and sometimes abrasive leadership style. The narrative explores how Jobs's vision and taste drove innovation, but also the personal costs of uncompromising standards. The book balances business history with human drama, illustrating how creativity, obsession, and charisma can build extraordinary companies. It is both a study of innovation and a cautionary tale about the trade-offs of relentless ambition. For readers interested in technology, leadership, and product design, it offers an intimate look at one of the most influential figures of the digital age.`,
                    vi: `Tiểu sử Steve Jobs của Walter Isaacson dựa trên các cuộc phỏng vấn rộng khắp với chính Jobs, đồng nghiệp, bạn bè và gia đình, tạo nên một chân dung phức tạp. Sách kể từ thời niên thiếu, sự hợp tác với Steve Wozniak, sự trỗi dậy của Apple, giai đoạn bị loại khỏi công ty và sự trở lại dẫn dắt Apple hồi sinh. Tác phẩm theo sát việc ra đời của Macintosh, iPod, iPhone, iPad, nhấn mạnh sự kết hợp giữa công nghệ và thiết kế tạo nên văn hóa Apple. Isaacson không né tránh tính cách khó chịu của Jobs—sự mãnh liệt, cầu toàn và phong cách lãnh đạo đôi khi sắc lạnh. Câu chuyện cho thấy tầm nhìn và gu thẩm mỹ thúc đẩy đổi mới, nhưng cũng phơi bày cái giá cá nhân của những tiêu chuẩn không khoan nhượng. Sách cân bằng lịch sử kinh doanh với kịch tính con người, minh họa cách sáng tạo, ám ảnh và sức hút có thể xây dựng công ty vĩ đại. Đây vừa là nghiên cứu về đổi mới, vừa là lời cảnh báo về đánh đổi của tham vọng không ngừng. Với người quan tâm công nghệ, lãnh đạo và thiết kế sản phẩm, đây là cái nhìn gần gũi về một nhân vật ảnh hưởng bậc nhất thời đại số.`
                }
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
                descriptionI18n: {
                    en: `Becoming is Michelle Obama's memoir of her journey from a working-class neighborhood on Chicago's South Side to the White House. She reflects on family, education, and the early experiences that shaped her sense of identity and purpose. The book traces her career, her marriage to Barack Obama, and the intense scrutiny of public life, while remaining grounded in personal memories. Michelle writes with warmth and candor, describing the challenges of balancing ambition with community expectations and the demands of motherhood with public responsibilities. She also highlights her initiatives as First Lady, particularly around health, education, and support for military families. Becoming is as much about self-definition as it is about achievement—learning to claim space, to speak with confidence, and to stay connected to one's roots. The memoir's appeal lies in its honesty and relatability, making a global figure feel accessible and human. It is an inspiring narrative of resilience, growth, and the ongoing process of becoming.`,
                    vi: `Becoming là hồi ký của Michelle Obama về hành trình từ khu lao động ở phía Nam Chicago đến Nhà Trắng. Bà kể về gia đình, giáo dục và những trải nghiệm sớm định hình bản sắc và mục đích sống. Cuốn sách theo dấu sự nghiệp, cuộc hôn nhân với Barack Obama và áp lực của đời sống công chúng, nhưng luôn giữ nền tảng từ ký ức cá nhân. Michelle viết chân thành và ấm áp, mô tả thách thức cân bằng tham vọng với kỳ vọng cộng đồng, cũng như vai trò làm mẹ với trách nhiệm công khai. Bà cũng nói về các sáng kiến khi là Đệ nhất phu nhân, đặc biệt trong lĩnh vực sức khỏe, giáo dục và hỗ trợ gia đình quân nhân. Becoming là câu chuyện về tự định nghĩa không kém phần là chuyện thành tựu—học cách chiếm lấy không gian, nói lên tiếng nói của mình và giữ kết nối với nguồn gốc. Sức hấp dẫn của hồi ký đến từ sự thật thà và gần gũi, khiến một nhân vật toàn cầu trở nên rất con người. Đây là câu chuyện truyền cảm hứng về nghị lực, trưởng thành và quá trình “trở thành” không ngừng.`
                }
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
                descriptionI18n: {
                    en: `Elon Musk by Ashlee Vance traces the entrepreneur's rise from a difficult childhood in South Africa to leading multiple transformative companies. The book follows Musk's early ventures in software and finance, then delves into the creation of SpaceX, Tesla, and other ambitious projects. Vance portrays Musk as a relentless innovator driven by grand missions, often pushing teams to extremes. The biography explores the culture of high-stakes innovation—tight deadlines, bold engineering bets, and the willingness to risk failure. It also highlights the personal costs of Musk's intensity, including strained relationships and volatility. The narrative is lively and detailed, offering insight into how modern tech empires are built and the personality traits that fuel them. While not hagiographic, it acknowledges Musk's outsized impact on electric vehicles and private spaceflight. The book serves as a case study in visionary leadership and the friction it can create. It is a compelling read for anyone interested in Silicon Valley, engineering ambition, or the psychology of high-risk entrepreneurship.`,
                    vi: `Elon Musk của Ashlee Vance kể lại hành trình từ tuổi thơ nhiều biến động ở Nam Phi đến vị trí lãnh đạo nhiều công ty mang tính đột phá. Sách theo dấu các dự án khởi nghiệp ban đầu trong phần mềm và tài chính, rồi đi sâu vào việc xây dựng SpaceX, Tesla và những tham vọng lớn khác. Vance khắc họa Musk như một nhà đổi mới không mệt mỏi, bị thôi thúc bởi sứ mệnh lớn và thường đẩy đội ngũ đến giới hạn. Tiểu sử phản ánh văn hóa đổi mới áp lực cao—thời hạn gắt gao, những canh bạc kỹ thuật táo bạo và chấp nhận rủi ro thất bại. Đồng thời, tác phẩm cũng cho thấy cái giá cá nhân của cường độ ấy: quan hệ căng thẳng và biến động cảm xúc. Câu chuyện sinh động, giàu chi tiết, giúp hiểu cách các đế chế công nghệ hiện đại được dựng nên và những đặc điểm tính cách thúc đẩy chúng. Sách không tâng bốc quá mức nhưng ghi nhận tác động to lớn của Musk lên xe điện và hàng không vũ trụ tư nhân. Đây là một nghiên cứu hấp dẫn về lãnh đạo tầm nhìn và những ma sát mà nó tạo ra.`
                }
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
                descriptionI18n: {
                    en: `Born a Crime is Trevor Noah's memoir of growing up in apartheid and post-apartheid South Africa as the child of a mixed-race relationship that was illegal at the time. The title reflects how his very existence was a crime under the law. Noah tells stories of poverty, violence, and political upheaval with humor and sharp observation, making heavy history feel immediate and personal. He writes about his mother's courage, the strict rules that separated communities, and the strange logic of a society built on racial classification. The memoir explores identity, belonging, and the ways language can cross boundaries and create safety. Noah's comedic voice does not diminish the pain; it highlights resilience and the strategies people use to survive. The book balances laughter with heartbreak, offering both cultural insight and a moving portrait of family. It is a powerful account of how a young boy navigated a fractured world and turned hardship into perspective.`,
                    vi: `Born a Crime là hồi ký của Trevor Noah về việc lớn lên ở Nam Phi thời apartheid và hậu apartheid, khi anh là con của một mối quan hệ khác chủng tộc bị pháp luật cấm. Tiêu đề phản ánh việc bản thân anh sinh ra đã là “tội lỗi” theo luật. Noah kể những câu chuyện về nghèo đói, bạo lực và biến động chính trị bằng giọng kể hài hước và quan sát sắc bén, khiến lịch sử nặng nề trở nên gần gũi. Anh viết về sự can đảm của mẹ mình, những quy định nghiêm ngặt chia cắt cộng đồng và logic kỳ quặc của xã hội dựa trên phân loại chủng tộc. Hồi ký khai thác bản sắc, cảm giác thuộc về và cách ngôn ngữ có thể bắc cầu an toàn. Giọng kể hài hước không làm giảm nỗi đau; nó làm nổi bật sự bền bỉ và chiến lược sinh tồn. Cuốn sách cân bằng tiếng cười với nước mắt, vừa cung cấp góc nhìn văn hóa vừa khắc họa một gia đình đầy yêu thương. Đây là câu chuyện mạnh mẽ về cách một cậu bé vượt qua thế giới rạn vỡ và biến khó khăn thành góc nhìn sống.`
                }
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
                descriptionI18n: {
                    en: `Long Walk to Freedom is Nelson Mandela's monumental autobiography, chronicling his life from a rural childhood to leadership of the anti-apartheid movement and, eventually, the presidency of South Africa. Mandela describes his early political awakening, the formation of the ANC's armed wing, and the moral choices that shaped decades of resistance. He recounts his long imprisonment on Robben Island with clarity and restraint, emphasizing discipline, solidarity, and hope under harsh conditions. The memoir explores sacrifice and the slow arc of justice, as well as the difficult work of reconciliation after liberation. Mandela's tone is dignified and reflective, revealing both strategic thinking and deep humanity. The book offers a firsthand view of political organizing, state repression, and the costs of principled leadership. It also shows the evolution of a man who moved from militancy to negotiation without abandoning the demand for equality. Long Walk to Freedom remains an essential historical document and a powerful testament to endurance and moral courage.`,
                    vi: `Long Walk to Freedom là hồi ký đồ sộ của Nelson Mandela, kể từ tuổi thơ ở nông thôn đến vai trò lãnh đạo phong trào chống apartheid và cuối cùng trở thành Tổng thống Nam Phi. Mandela mô tả sự thức tỉnh chính trị, việc thành lập cánh vũ trang của ANC và những lựa chọn đạo đức định hình nhiều thập kỷ đấu tranh. Ông kể về những năm tháng tù đày ở đảo Robben bằng giọng điệu điềm tĩnh, nhấn mạnh kỷ luật, tình đoàn kết và hy vọng trong điều kiện khắc nghiệt. Hồi ký khám phá sự hy sinh, hành trình dài của công lý và công việc hòa giải đầy khó khăn sau ngày tự do. Giọng văn trang nghiêm và suy tư, cho thấy cả tư duy chiến lược lẫn nhân tính sâu sắc. Cuốn sách cung cấp góc nhìn trực tiếp về tổ chức chính trị, đàn áp của nhà nước và cái giá của lãnh đạo có nguyên tắc. Nó cũng cho thấy sự chuyển hóa từ đấu tranh vũ trang sang đàm phán mà không từ bỏ yêu cầu bình đẳng. Long Walk to Freedom là tài liệu lịch sử thiết yếu và là minh chứng mạnh mẽ cho sự kiên cường và dũng khí đạo đức.`
                }
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
                descriptionI18n: {
                    en: `Harry Potter and the Sorcerer's Stone introduces Harry, an orphan who discovers on his eleventh birthday that he is a wizard. He enters Hogwarts School of Witchcraft and Wizardry, where he finds friendship, rivalry, and a sense of belonging he has never known. The book follows Harry's first year as he navigates classes, a mysterious three-headed dog, and the secrets surrounding his past. J.K. Rowling blends humor and wonder with a gradually darkening mystery, building a rich magical world full of spells, creatures, and lore. At its heart, the story is about identity, courage, and the power of chosen family. The plot is accessible for younger readers but layered enough to captivate adults. It sets the foundation for the larger series while delivering a complete adventure in its own right. The book's charm lies in its sense of discovery and its celebration of friendship and bravery. It remains one of the most beloved entry points into modern fantasy.`,
                    vi: `Harry Potter and the Sorcerer's Stone giới thiệu Harry, cậu bé mồ côi phát hiện vào sinh nhật 11 tuổi rằng mình là phù thủy. Cậu bước vào Hogwarts—ngôi trường phép thuật—nơi tìm thấy bạn bè, đối thủ và cảm giác thuộc về mà cậu chưa từng có. Câu chuyện theo chân Harry trong năm học đầu tiên với những tiết học phép thuật, chú chó ba đầu bí ẩn và những bí mật xoay quanh quá khứ của cậu. J.K. Rowling kết hợp sự hài hước và kỳ diệu với một bí ẩn ngày càng tối, xây dựng thế giới phép thuật giàu sinh vật, bùa chú và truyền thuyết. Cốt lõi của truyện là bản sắc, lòng dũng cảm và sức mạnh của gia đình được lựa chọn. Tác phẩm dễ tiếp cận với độc giả nhỏ tuổi nhưng đủ lớp nghĩa để người lớn yêu thích. Nó đặt nền móng cho cả series đồng thời mang lại một chuyến phiêu lưu trọn vẹn. Sức hấp dẫn nằm ở cảm giác khám phá và sự tôn vinh tình bạn, lòng can đảm. Đây vẫn là cánh cửa được yêu mến nhất dẫn vào fantasy hiện đại.`
                }
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
                descriptionI18n: {
                    en: `Charlotte's Web tells the story of Wilbur, a runt pig saved by a young girl named Fern and later moved to her uncle's farm. When Wilbur learns he may be slaughtered, he befriends Charlotte, a wise spider who spins words into her web to convince the townspeople he is special. Their friendship becomes the heart of the story, celebrating kindness, loyalty, and quiet courage. E.B. White writes with gentle humor and deep empathy, making farm life feel vivid and meaningful. The book does not shy away from life's bittersweet realities, including loss and the cycle of seasons, but it frames them with warmth and acceptance. Charlotte's sacrifice and Wilbur's growth give the story emotional weight that resonates with children and adults alike. The language is simple yet poetic, perfect for shared reading. Charlotte's Web remains a classic because it treats young readers with respect and offers a compassionate view of life, friendship, and change.`,
                    vi: `Charlotte's Web kể về Wilbur, chú heo yếu ớt được cô bé Fern cứu và đưa đến trang trại của bác. Khi Wilbur biết mình có thể bị làm thịt, cậu kết bạn với Charlotte, một con nhện thông minh đã dệt những dòng chữ lên mạng để thuyết phục mọi người rằng Wilbur đặc biệt. Tình bạn của họ là trái tim câu chuyện, tôn vinh lòng tốt, sự trung thành và sự can đảm lặng lẽ. E.B. White viết với giọng điệu dịu dàng và đầy cảm thông, khiến đời sống trang trại trở nên sống động và ý nghĩa. Cuốn sách không né tránh những thực tế ngọt đắng của cuộc sống, bao gồm mất mát và chu kỳ thời gian, nhưng luôn đặt trong sự ấm áp và chấp nhận. Sự hy sinh của Charlotte và quá trình trưởng thành của Wilbur tạo chiều sâu cảm xúc cho câu chuyện, chạm tới cả trẻ em lẫn người lớn. Ngôn ngữ giản dị mà giàu chất thơ, rất phù hợp để đọc cùng nhau. Charlotte's Web trở thành kinh điển vì tôn trọng độc giả nhỏ tuổi và mang đến cái nhìn nhân ái về tình bạn, cuộc sống và đổi thay.`
                }
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
                descriptionI18n: {
                    en: `The Hobbit follows Bilbo Baggins, a comfort-loving hobbit who is swept into an adventure by the wizard Gandalf and a band of dwarves. Their quest is to reclaim a mountain and its treasure from the dragon Smaug. Along the way, Bilbo encounters trolls, elves, giant spiders, and the creature Gollum, discovering courage and resourcefulness he never knew he possessed. The story blends humor with danger, capturing the thrill of the unknown and the growth that comes from stepping beyond comfort. Tolkien's world-building is vivid, with songs, maps, and lore that give Middle-earth a timeless texture. The book explores themes of greed, bravery, and the moral choices that define character. It is written in a playful, conversational tone, making it accessible to younger readers while still appealing to adults. The Hobbit stands as a classic of fantasy, a journey story that celebrates curiosity and the unexpected hero within ordinary people.`,
                    vi: `The Hobbit kể về Bilbo Baggins, một người hobbit yêu sự yên ổn, bị pháp sư Gandalf và nhóm người lùn kéo vào cuộc phiêu lưu. Mục tiêu của họ là giành lại ngọn núi và kho báu khỏi rồng Smaug. Trên đường, Bilbo gặp quỷ lùn, yêu tinh, nhện khổng lồ và sinh vật bí ẩn Gollum, dần khám phá lòng dũng cảm và sự lanh lợi mà mình chưa từng biết. Câu chuyện cân bằng giữa hài hước và nguy hiểm, thể hiện niềm vui của cái chưa biết và sự trưởng thành khi bước ra khỏi vùng an toàn. Thế giới Tolkien được xây dựng sống động với bản đồ, bài hát và truyền thuyết, tạo cảm giác trường tồn cho Trung Địa. Tác phẩm khai thác chủ đề tham lam, dũng khí và những lựa chọn đạo đức định hình nhân cách. Văn phong trò chuyện, vui nhộn khiến sách dễ đọc với trẻ em nhưng vẫn hấp dẫn người lớn. The Hobbit là kinh điển fantasy, ca ngợi sự tò mò và người anh hùng bất ngờ trong những con người bình thường.`
                }
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
                descriptionI18n: {
                    en: `Matilda is the story of a brilliant young girl whose love of books is her refuge from neglectful parents and a cruel headmistress, Miss Trunchbull. Matilda's intelligence is extraordinary, and she discovers she has a mysterious power that allows her to move objects with her mind. As she bonds with the kind teacher Miss Honey, Matilda learns to channel her abilities in defense of those she cares about. Roald Dahl's narrative blends mischief, humor, and a strong sense of justice, celebrating intelligence and kindness as real forms of strength. The villains are exaggerated in a way that feels both scary and funny, while the triumphs are deeply satisfying. The book encourages children to believe in their own agency, even in unfair circumstances. Matilda's courage is quiet but determined, and her victories are as much moral as magical. It's a sharp, empowering classic that remains a favorite for young readers and adults who love Dahl's playful style.`,
                    vi: `Matilda kể về cô bé thông minh tuyệt vời, coi sách là nơi trú ẩn trước cha mẹ thờ ơ và cô hiệu trưởng tàn bạo Miss Trunchbull. Matilda không chỉ ham đọc mà còn phát hiện mình có năng lực kỳ lạ: di chuyển đồ vật bằng ý nghĩ. Khi gắn bó với cô giáo hiền hậu Miss Honey, Matilda học cách dùng khả năng để bảo vệ người mình quan tâm. Roald Dahl pha trộn tinh nghịch, hài hước và tinh thần công lý mạnh mẽ, tôn vinh trí tuệ và lòng tốt như sức mạnh thật sự. Nhân vật phản diện bị phóng đại vừa đáng sợ vừa buồn cười, trong khi chiến thắng của Matilda mang cảm giác thỏa mãn sâu sắc. Cuốn sách khuyến khích trẻ em tin vào khả năng tự bảo vệ trong những hoàn cảnh bất công. Lòng can đảm của Matilda không ồn ào nhưng kiên định, và chiến thắng của em vừa mang tính đạo đức vừa kỳ diệu. Đây là tác phẩm kinh điển sắc sảo, trao quyền, được cả trẻ em lẫn người lớn yêu thích bởi phong cách dí dỏm của Dahl.`
                }
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
                descriptionI18n: {
                    en: `Where the Wild Things Are is a short picture book with enormous emotional depth. Max, sent to his room after misbehaving, imagines sailing to a land of wild creatures and becoming their king. The “wild things” roar and gnash their teeth, but Max tames them with a look, showing how imagination can transform fear into power. After a wild rumpus, Max feels lonely and chooses to return home, where a warm supper waits. Maurice Sendak captures the intensity of childhood emotions—anger, defiance, wonder, and the longing for comfort—without moralizing. The sparse text and expressive illustrations leave space for readers to feel the story rather than be told what to feel. It is a celebration of imagination and a reassurance that love remains even after conflict. The book's brevity is part of its magic, making it perfect for repeated readings. A Caldecott Medal winner, it remains a timeless classic for children and adults alike.`,
                    vi: `Where the Wild Things Are là cuốn sách tranh ngắn nhưng giàu chiều sâu cảm xúc. Max, sau khi bị phạt vì quậy phá, tưởng tượng mình ra khơi đến vùng đất của những quái vật hoang dã và trở thành vua của chúng. Những “wild things” gầm gừ và nhe răng, nhưng Max thuần phục chúng chỉ bằng một cái nhìn, cho thấy trí tưởng tượng có thể biến nỗi sợ thành sức mạnh. Sau buổi “vũ hội hoang dã,” Max cảm thấy cô đơn và quyết định trở về nhà, nơi bữa ăn nóng đang chờ. Maurice Sendak diễn tả trọn vẹn cảm xúc tuổi thơ—giận dữ, bướng bỉnh, ngạc nhiên và khát khao được yêu thương—mà không dạy đời. Lời văn tối giản và minh họa biểu cảm tạo khoảng trống để người đọc tự cảm nhận. Cuốn sách tôn vinh trí tưởng tượng và khẳng định rằng tình yêu vẫn ở đó ngay cả sau xung đột. Sự ngắn gọn chính là ma thuật của nó, khiến người đọc muốn đọc đi đọc lại. Đây là tác phẩm kinh điển đoạt huy chương Caldecott, vẫn chạm đến cả trẻ em lẫn người lớn.`
                }
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
