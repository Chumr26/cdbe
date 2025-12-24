const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and address management
 */

// All routes are protected
router.use(protect);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/profile', getProfile);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@test.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', updateProfile);

/**
 * @swagger
 * /users/addresses:
 *   post:
 *     summary: Add a new address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: Address added successfully
 */
router.post('/addresses', addAddress);

/**
 * @swagger
 * /users/addresses/{id}:
 *   put:
 *     summary: Update an address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: Address not found
 */
router.put('/addresses/:id', updateAddress);

/**
 * @swagger
 * /users/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: Address not found
 */
router.delete('/addresses/:id', deleteAddress);

module.exports = router;
