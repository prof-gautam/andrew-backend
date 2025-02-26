// 📂 src/utils/paginationHelper.js
exports.paginateQuery = async (model, query, page, limit) => {
    try {
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        const [results, total] = await Promise.all([
            model.find(query).skip(skip).limit(limitNumber),
            model.countDocuments(query)
        ]);

        return {
            data: results,
            pagination: {
                totalItems: total,
                currentPage: pageNumber,
                totalPages: Math.ceil(total / limitNumber),
                limit: limitNumber
            }
        };
    } catch (error) {
        throw new Error('Pagination failed');
    }
};
