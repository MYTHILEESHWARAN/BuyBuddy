const Product = require('../models/Product');

// ──────────────────────────────────────────
// @route   GET /api/products
// @desc    Get all products with search, filter, sort
// @access  Public
// ──────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, minRating, minDiscount, sort } = req.query;

    let query = {};

    // Text search (safe regex)
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { category: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Category filter
    if (category && category.trim() && category.trim() !== 'All') {
      const sanitizedCat = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = { $regex: `^${sanitizedCat}$`, $options: 'i' };
    }

    // Price filter
    const parsedMin = minPrice !== undefined && minPrice !== '' && !isNaN(parseFloat(minPrice)) ? parseFloat(minPrice) : null;
    const parsedMax = maxPrice !== undefined && maxPrice !== '' && !isNaN(parseFloat(maxPrice)) ? parseFloat(maxPrice) : null;
    if (parsedMin !== null || parsedMax !== null) {
      query.price = {};
      if (parsedMin !== null) query.price.$gte = parsedMin;
      if (parsedMax !== null) query.price.$lte = parsedMax;
    }

    // Rating filter
    if (minRating && !isNaN(parseFloat(minRating))) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Discount filter
    if (minDiscount && !isNaN(parseFloat(minDiscount))) {
      query.discountPercent = { $gte: parseFloat(minDiscount) };
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // default: newest first
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'rating_desc') sortOption = { rating: -1 };
    else if (sort === 'discount_desc') sortOption = { discountPercent: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };
    else if (sort === 'name_desc') sortOption = { name: -1 };

    const products = await Product.find(query).sort(sortOption);

    // Get unique categories for filter options
    const categories = await Product.distinct('category');

    return res.status(200).json({ products, categories });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({ message: 'Server error fetching products' });
  }
};

// ──────────────────────────────────────────
// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
// ──────────────────────────────────────────
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.status(200).json({ product });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Product not found (invalid ID)' });
    }
    console.error('Get product error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/products/:id/reviews
// @desc    Create new product review
// @access  Private (JWT required)
// ──────────────────────────────────────────
const createProductReview = async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || !comment || comment.trim().length === 0) {
    return res.status(400).json({ message: 'Rating and review comment are required' });
  }

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment: comment.trim(),
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    return res.status(201).json({ message: 'Review added successfully', product });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ message: 'Server error submitting review' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/products
// @desc    Create a product (seed/admin use)
// @access  Private
// ──────────────────────────────────────────
const createProduct = async (req, res) => {
  try {
    const { name, description, price, originalPrice, discountPercent, image, category, stock, specifications } = req.body;
    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      discountPercent,
      image,
      category,
      stock,
      specifications,
    });
    return res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(400).json({ message: error.message });
  }
};

// ──────────────────────────────────────────
// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private
// ──────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.status(200).json({ product });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(400).json({ message: error.message });
  }
};

// ──────────────────────────────────────────
// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private
// ──────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
};
