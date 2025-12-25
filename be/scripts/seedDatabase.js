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
            { name: 'Fiction', slug: 'fiction', description: 'Fictional books and novels' },
            { name: 'Non-Fiction', slug: 'non-fiction', description: 'Real-world topics and biographies' },
            { name: 'Science', slug: 'science', description: 'Science and technology books' },
            { name: 'Technology', slug: 'technology', description: 'Programming and tech books' },
            { name: 'Self-Help', slug: 'self-help', description: 'Personal development and motivation' },
            { name: 'History', slug: 'history', description: 'Historical events and figures' },
            { name: 'Biography', slug: 'biography', description: 'Life stories of famous people' },
            { name: 'Children', slug: 'children', description: 'Books for kids' },
            { name: 'Romance', slug: 'romance', description: 'Love and relationships' },
            { name: 'Thriller', slug: 'thriller', description: 'Suspense and mystery books' }
        ];

        const categories = await db.collection('categories').insertMany(categoryList.map(c => ({
            ...c,
            parentCategory: null,
            createdAt: new Date(),
            updatedAt: new Date()
        })));
        console.log(`✅ Created ${categories.insertedCount} categories\n`);

        // ---------------------------------------------------------
        // 2. Seed Users
        // ---------------------------------------------------------
        console.log('👤 Creating users...');
        const usersToSeed = [];

        // 2.1 Admin User
        const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
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
            updatedAt: new Date()
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
            addresses: [{
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
                country: 'USA',
                isDefault: true
            }],
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 2.3 Generate 48 random users
        for (let i = 0; i < 48; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            usersToSeed.push({
                email: faker.internet.email({ firstName, lastName }).toLowerCase(),
                password: userPassword,
                role: 'customer',
                firstName: firstName,
                lastName: lastName,
                phoneNumber: faker.phone.number(),
                addresses: [{
                    street: faker.location.streetAddress(),
                    city: faker.location.city(),
                    state: faker.location.state(),
                    zipCode: faker.location.zipCode(),
                    country: faker.location.country(),
                    isDefault: true
                }],
                isEmailVerified: faker.datatype.boolean(),
                createdAt: faker.date.past(),
                updatedAt: new Date()
            });
        }

        const insertedUsers = await db.collection('users').insertMany(usersToSeed);
        const userIdList = Object.values(insertedUsers.insertedIds);
        console.log(`✅ Created ${insertedUsers.insertedCount} users\n`);


        // ---------------------------------------------------------
        // 3. Seed Real Products
        // ---------------------------------------------------------
        console.log('📖 Seeding real books and fetching covers...');

        // Curated list of real books with ISBNs
        const realBooksList = [
            // Fiction
            { title: 'The Great Gatsby', isbn: '9780743273565', author: 'F. Scott Fitzgerald', category: 'Fiction', publisher: 'Scribner', publicationYear: 2004, pageCount: 180, description: 'A classic American novel set in the Jazz Age.' },
            { title: 'To Kill a Mockingbird', isbn: '9780061120084', author: 'Harper Lee', category: 'Fiction', publisher: 'Harper Perennial', publicationYear: 2006, pageCount: 324, description: 'A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice.' },
            { title: '1984', isbn: '9780451524935', author: 'George Orwell', category: 'Fiction', publisher: 'Signet Classic', publicationYear: 1961, pageCount: 328, description: 'A dystopian social science fiction novel and cautionary tale about totalitarianism.' },
            { title: 'Pride and Prejudice', isbn: '9780141439518', author: 'Jane Austen', category: 'Fiction', publisher: 'Penguin Classics', publicationYear: 2002, pageCount: 480, description: 'A romantic novel of manners written by Jane Austen.' },
            { title: 'The Catcher in the Rye', isbn: '9780316769488', author: 'J.D. Salinger', category: 'Fiction', publisher: 'Little, Brown and Company', publicationYear: 1991, pageCount: 277, description: 'A story about teenage rebellion and alienation.' },

            // Technology
            { title: 'Clean Code', isbn: '9780132350884', author: 'Robert C. Martin', category: 'Technology', publisher: 'Prentice Hall', publicationYear: 2008, pageCount: 464, description: 'A Handbook of Agile Software Craftsmanship.' },
            { title: 'The Pragmatic Programmer', isbn: '9780135957059', author: 'David Thomas', category: 'Technology', publisher: 'Addison-Wesley', publicationYear: 2019, pageCount: 352, description: 'Timeless advice for software developers.' },
            { title: 'Introduction to Algorithms', isbn: '9780262033848', author: 'Thomas H. Cormen', category: 'Technology', publisher: 'MIT Press', publicationYear: 2009, pageCount: 1312, description: 'A comprehensive educational guide to algorithms.' },
            { title: 'Design Patterns', isbn: '9780201633610', author: 'Erich Gamma', category: 'Technology', publisher: 'Addison-Wesley', publicationYear: 1994, pageCount: 395, description: 'Elements of Reusable Object-Oriented Software.' },
            { title: 'You Don\'t Know JS', isbn: '9781491904244', author: 'Kyle Simpson', category: 'Technology', publisher: 'O\'Reilly', publicationYear: 2015, pageCount: 278, description: 'Deep dive into JavaScript core mechanisms.' },

            // Science
            { title: 'A Brief History of Time', isbn: '9780553380163', author: 'Stephen Hawking', category: 'Science', publisher: 'Bantam', publicationYear: 1998, pageCount: 256, description: 'Explaining the universe, from the Big Bang to black holes.' },
            { title: 'Sapiens: A Brief History of Humankind', isbn: '9780062316110', author: 'Yuval Noah Harari', category: 'Science', publisher: 'Harper', publicationYear: 2015, pageCount: 443, description: 'A survey of the history of humankind.' },
            { title: 'Cosmos', isbn: '9780345331309', author: 'Carl Sagan', category: 'Science', publisher: 'Ballantine Books', publicationYear: 2013, pageCount: 365, description: 'Explores the mutual development of science and civilization.' },
            { title: 'The Selfish Gene', isbn: '9780198788607', author: 'Richard Dawkins', category: 'Science', publisher: 'Oxford University Press', publicationYear: 2016, pageCount: 544, description: 'A gene-centric view of evolution.' },
            { title: 'What If?', isbn: '9780544272996', author: 'Randall Munroe', category: 'Science', publisher: 'Houghton Mifflin Harcourt', publicationYear: 2014, pageCount: 303, description: 'Serious Scientific Answers to Absurd Hypothetical Questions.' },

            // Non-Fiction & History
            { title: 'Educated', isbn: '9780399590504', author: 'Tara Westover', category: 'Non-Fiction', publisher: 'Random House', publicationYear: 2018, pageCount: 334, description: 'A Memoir about growing up in a survivalist family.' },
            { title: 'Thinking, Fast and Slow', isbn: '9780374533557', author: 'Daniel Kahneman', category: 'Non-Fiction', publisher: 'Farrar, Straus and Giroux', publicationYear: 2011, pageCount: 499, description: 'Analysis of the two systems that drive the way we think.' },
            { title: 'The Diary of a Young Girl', isbn: '9780553296983', author: 'Anne Frank', category: 'History', publisher: 'Bantam', publicationYear: 1993, pageCount: 283, description: 'The writings from the Dutch language diary kept by Anne Frank while she was in hiding.' },
            { title: 'Guns, Germs, and Steel', isbn: '9780393317558', author: 'Jared Diamond', category: 'History', publisher: 'W. W. Norton', publicationYear: 1999, pageCount: 480, description: 'The Fates of Human Societies.' },
            { title: 'Into the Wild', isbn: '9780385486804', author: 'Jon Krakauer', category: 'Non-Fiction', publisher: 'Anchor', publicationYear: 1997, pageCount: 207, description: 'The true story of Christopher McCandless.' },

            // Self-Help
            { title: 'Atomic Habits', isbn: '9780735211292', author: 'James Clear', category: 'Self-Help', publisher: 'Avery', publicationYear: 2018, pageCount: 320, description: 'Tiny Changes, Remarkable Results.' },
            { title: 'The Power of Now', isbn: '9781577314806', author: 'Eckhart Tolle', category: 'Self-Help', publisher: 'New World Library', publicationYear: 2004, pageCount: 229, description: 'A Guide to Spiritual Enlightenment.' },
            { title: 'The 7 Habits of Highly Effective People', isbn: '9780743269513', author: 'Stephen R. Covey', category: 'Self-Help', publisher: 'Simon & Schuster', publicationYear: 2004, pageCount: 381, description: 'Powerful Lessons in Personal Change.' },
            { title: 'How to Win Friends and Influence People', isbn: '9780671027032', author: 'Dale Carnegie', category: 'Self-Help', publisher: 'Simon & Schuster', publicationYear: 1998, pageCount: 288, description: 'Classic advice on managing relationships.' },
            { title: 'Deep Work', isbn: '9781455586691', author: 'Cal Newport', category: 'Self-Help', publisher: 'Grand Central Publishing', publicationYear: 2016, pageCount: 296, description: 'Rules for Focused Success in a Distracted World.' },

            // Thriller & Mystery
            { title: 'The Da Vinci Code', isbn: '9780307474278', author: 'Dan Brown', category: 'Thriller', publisher: 'Anchor', publicationYear: 2009, pageCount: 480, description: 'A mystery detective novel involving symbology.' },
            { title: 'Gone Girl', isbn: '9780307588371', author: 'Gillian Flynn', category: 'Thriller', publisher: 'Crown', publicationYear: 2012, pageCount: 415, description: 'A psychological thriller about a woman who disappears.' },
            { title: 'The Girl with the Dragon Tattoo', isbn: '9780307949486', author: 'Stieg Larsson', category: 'Thriller', publisher: 'Vintage', publicationYear: 2011, pageCount: 644, description: 'A mystery novel about a missing person investigation.' },
            { title: 'The Silent Patient', isbn: '9781250301697', author: 'Alex Michaelides', category: 'Thriller', publisher: 'Celadon Books', publicationYear: 2019, pageCount: 336, description: 'A psychological thriller about a woman who shoots her husband.' },
            { title: 'And Then There Were None', isbn: '9780062073488', author: 'Agatha Christie', category: 'Thriller', publisher: 'William Morrow', publicationYear: 2011, pageCount: 264, description: 'A mystery novel about ten strangers trapped on an island.' },

            // Romance
            { title: 'The Notebook', isbn: '9780446605236', author: 'Nicholas Sparks', category: 'Romance', publisher: 'Warner Books', publicationYear: 1996, pageCount: 214, description: 'A modern classic romance novel.' },
            { title: 'Me Before You', isbn: '9780143124542', author: 'Jojo Moyes', category: 'Romance', publisher: 'Penguin Books', publicationYear: 2012, pageCount: 400, description: 'A romantic story about a caregiver and a paralyzed man.' },
            { title: 'Outlander', isbn: '9780440212560', author: 'Diana Gabaldon', category: 'Romance', publisher: 'Dell', publicationYear: 1991, pageCount: 850, description: 'Historical time travel romance.' },
            { title: 'The Hating Game', isbn: '9780062439604', author: 'Sally Thorne', category: 'Romance', publisher: 'William Morrow', publicationYear: 2016, pageCount: 384, description: 'A workplace comedy romance.' },
            { title: 'It Ends with Us', isbn: '9781501110368', author: 'Colleen Hoover', category: 'Romance', publisher: 'Atria Books', publicationYear: 2016, pageCount: 384, description: 'A romance novel touching on difficult themes.' },

            // Biography
            { title: 'Steve Jobs', isbn: '9781451648539', author: 'Walter Isaacson', category: 'Biography', publisher: 'Simon & Schuster', publicationYear: 2011, pageCount: 656, description: 'The biography of the Apple co-founder.' },
            { title: 'Becoming', isbn: '9781524763138', author: 'Michelle Obama', category: 'Biography', publisher: 'Crown', publicationYear: 2018, pageCount: 448, description: 'Memoir of the former First Lady of the United States.' },
            { title: 'Elon Musk', isbn: '9780062301239', author: 'Ashlee Vance', category: 'Biography', publisher: 'Ecco', publicationYear: 2015, pageCount: 400, description: 'Tesla, SpaceX, and the Quest for a Fantastic Future.' },
            { title: 'Born a Crime', isbn: '9780399588174', author: 'Trevor Noah', category: 'Biography', publisher: 'Spiegel & Grau', publicationYear: 2016, pageCount: 304, description: 'Stories from a South African Childhood.' },
            { title: 'Long Walk to Freedom', isbn: '9780316548182', author: 'Nelson Mandela', category: 'Biography', publisher: 'Little, Brown and Company', publicationYear: 1995, pageCount: 656, description: 'The autobiography of Nelson Mandela.' },

            // Children
            { title: 'Harry Potter and the Sorcerer\'s Stone', isbn: '9780590353427', author: 'J.K. Rowling', category: 'Children', publisher: 'Scholastic', publicationYear: 1998, pageCount: 309, description: 'The first novel in the Harry Potter series.' },
            { title: 'Charlotte\'s Web', isbn: '9780061124952', author: 'E.B. White', category: 'Children', publisher: 'HarperCollins', publicationYear: 2006, pageCount: 192, description: 'A story of friendship between a pig and a spider.' },
            { title: 'The Hobbit', isbn: '9780547928227', author: 'J.R.R. Tolkien', category: 'Children', publisher: 'Houghton Mifflin Harcourt', publicationYear: 2012, pageCount: 300, description: 'The prelude to The Lord of the Rings.' },
            { title: 'Matilda', isbn: '9780142410370', author: 'Roald Dahl', category: 'Children', publisher: 'Puffin Books', publicationYear: 2007, pageCount: 240, description: 'A story about a precocious child with magical powers.' },
            { title: 'Where the Wild Things Are', isbn: '9780060254926', author: 'Maurice Sendak', category: 'Children', publisher: 'HarperCollins', publicationYear: 1963, pageCount: 48, description: 'A picture book about a boy\'s imaginary adventures.' }
        ];

        const allProducts = [];

        // Process real books (fetch covers concurrently)
        console.log(`   Processing ${realBooksList.length} real books...`);

        // Fetch all covers concurrently using Promise.all
        const bookProcessingPromises = realBooksList.map(async (book) => {
            let cover = { source: 'placeholder', url: null };
            try {
                console.log(`   Fetching cover for: ${book.title}`);
                const url = await getBookCover({ isbn: book.isbn, title: book.title, author: book.author });

                if (url) {
                    cover = { source: 'api', url: url };
                }
            } catch (e) {
                console.log(`   Failed to fetch cover for ${book.title}:`, e.message);
            }

            return {
                ...book,
                price: parseFloat(faker.commerce.price({ min: 10, max: 60 })),
                stock: faker.number.int({ min: 5, max: 100 }),
                rating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
                numReviews: faker.number.int({ min: 10, max: 1000 }),
                featured: faker.datatype.boolean(),
                language: 'English',
                isActive: true,
                coverImage: cover,
                images: [], // Legacy field
                createdAt: faker.date.past(),
                updatedAt: new Date()
            };
        });

        // Wait for all books to be processed
        const processedBooks = await Promise.all(bookProcessingPromises);
        allProducts.push(...processedBooks);

        const insertedProducts = await db.collection('products').insertMany(allProducts);
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
                const pIndex = faker.number.int({ min: 0, max: allProducts.length - 1 });
                const pId = productIdList[pIndex];
                const pData = allProducts[pIndex];

                cartItems.push({
                    product: pId,
                    quantity: faker.number.int({ min: 1, max: 3 }),
                    price: pData.price
                });
            }

            cartsToSeed.push({
                user: customers[i],
                items: cartItems,
                totalPrice: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                createdAt: new Date(),
                updatedAt: new Date()
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
            const userIndex = faker.number.int({ min: 1, max: customers.length - 1 });
            const userId = userIdList[userIndex];

            const orderItems = [];
            const numItems = faker.number.int({ min: 1, max: 4 });

            for (let j = 0; j < numItems; j++) {
                const pIndex = faker.number.int({ min: 0, max: allProducts.length - 1 });
                const pId = productIdList[pIndex];
                const pData = allProducts[pIndex];

                orderItems.push({
                    productId: pId,
                    title: pData.title,
                    isbn: pData.isbn,
                    quantity: faker.number.int({ min: 1, max: 2 }),
                    price: pData.price
                });
            }

            const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const timestamp = Date.now().toString().slice(-8);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

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
                    phoneNumber: faker.phone.number()
                },
                paymentStatus: faker.helpers.arrayElement(['completed', 'pending']),
                orderStatus: faker.helpers.arrayElement(['processing', 'shipped', 'delivered', 'pending']),
                total: parseFloat((totalAmount * 1.1 + 5.00).toFixed(2)), // + Tax & Ship
                createdAt: faker.date.past(),
                updatedAt: new Date()
            });
        }

        await db.collection('orders').insertMany(ordersToSeed);
        console.log(`✅ Created ${ordersToSeed.length} orders\n`);


        // ---------------------------------------------------------
        // Summary
        // ---------------------------------------------------------
        console.log('📊 Database Summary:');
        console.log(`   Users: ${await db.collection('users').countDocuments()}`);
        console.log(`   Categories: ${await db.collection('categories').countDocuments()}`);
        console.log(`   Products: ${await db.collection('products').countDocuments()}`);
        console.log(`   Carts: ${await db.collection('carts').countDocuments()}`);
        console.log(`   Orders: ${await db.collection('orders').countDocuments()}`);

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
