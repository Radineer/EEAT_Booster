const prisma = require('../utils/prisma');
const { slugify } = require('../utils/slugify');

/**
 * Author Service – CRUD helpers for AuthorProfile
 */
const AuthorService = {
  /*
   * Create a new author profile for given tenant.
   * @param {String} tenantId
   * @param {Object} data – name, slug?, title?, bio?, avatarUrl?, credentials?, socials?
   */
  async create(tenantId, data) {
    if (!tenantId) throw new Error('tenantId is required');
    if (!data?.name) throw new Error('name is required');

    // Generate slug if not provided
    let slug = data.slug?.trim();
    if (!slug) {
      slug = slugify(data.name);
    }

    // Ensure slug uniqueness within tenant
    const exists = await prisma.authorProfile.findFirst({
      where: {
        tenantId,
        slug,
      },
    });
    if (exists) {
      throw new Error('Slug already exists');
    }

    const author = await prisma.authorProfile.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        title: data.title,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        credentials: data.credentials,
        socials: data.socials,
      },
    });

    return author;
  },

  /*
   * List authors under tenant with optional pagination/filter
   */
  async list(tenantId, opts = {}) {
    const { skip = 0, take = 50, search } = opts;
    return prisma.authorProfile.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  },

  /*
   * Get single author by id (and tenant check)
   */
  async getById(tenantId, id) {
    return prisma.authorProfile.findFirst({
      where: {
        id,
        tenantId,
      },
    });
  },

  /*
   * Update author
   */
  async update(tenantId, id, data) {
    // If slug is changed, validate
    if (data.slug) {
      const exists = await prisma.authorProfile.findFirst({
        where: {
          tenantId,
          slug: data.slug,
          NOT: { id },
        },
      });
      if (exists) throw new Error('Slug already exists');
    }

    return prisma.authorProfile.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        title: data.title,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        credentials: data.credentials,
        socials: data.socials,
      },
    });
  },

  /*
   * Delete author (hard delete for now; could be soft)
   */
  async remove(tenantId, id) {
    // First ensure author belongs to tenant
    const author = await prisma.authorProfile.findFirst({ where: { id, tenantId } });
    if (!author) throw new Error('Author not found');
    return prisma.authorProfile.delete({ where: { id } });
  },
};

module.exports = AuthorService;