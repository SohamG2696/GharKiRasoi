// server/middleware/auth.js - Secure Supabase Auth & Server-Side Role Verification Middleware
const { supabaseAdmin, isCloudMode } = require('../supabaseClient');
const store = require('../dataStore');

/**
 * Primary Authentication Middleware
 * Validates Supabase JWTs in Cloud mode; supports mock tokens only in local mode.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Missing or malformed Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1].trim();

    // In Cloud Mode: strictly verify Supabase JWT
    if (isCloudMode()) {
      // Guard against mock tokens in cloud mode
      if (token.startsWith('mock-jwt-')) {
        return res.status(401).json({
          message: 'Mock authentication tokens are rejected in Cloud Mode. Please provide a valid Supabase Auth session token.'
        });
      }

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({
          message: 'Invalid or expired Supabase authentication token.',
          details: error ? error.message : null
        });
      }

      // Fetch user profile and assigned roles from database
      let profile = null;
      let roles = [];

      try {
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();

        profile = profileData;

        if (profile) {
          const { data: rolesData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          if (rolesData && rolesData.length > 0) {
            roles = rolesData.map(r => r.role);
          }
        }
      } catch (dbErr) {
        // Log error without exposing secrets
        console.error('Error fetching user roles from database:', dbErr.message);
      }

      // Fallback role resolution from Supabase Auth user_metadata
      const metadataRole = user.user_metadata?.role;
      const primaryRole = roles[0] || metadataRole || 'CUSTOMER';

      req.user = {
        id: profile ? profile.id : user.id,
        authUserId: user.id,
        email: user.email,
        fullName: profile?.full_name || user.user_metadata?.fullName || user.email,
        role: primaryRole,
        roles: roles.length > 0 ? roles : [primaryRole],
        profile
      };

      return next();
    }

    // Local / Offline Store Mode: resolve user from store
    let userId = null;
    if (token.startsWith('mock-jwt-')) {
      userId = token.replace('mock-jwt-', '');
    } else {
      userId = token;
    }

    const localUser = store.findUserById(userId);
    if (!localUser) {
      return res.status(401).json({ message: 'User session not found in local store.' });
    }

    const { password, ...safeUser } = localUser;
    req.user = {
      ...safeUser,
      authUserId: safeUser.id,
      roles: [safeUser.role]
    };

    return next();
  } catch (err) {
    return res.status(500).json({
      message: 'Authentication verification failure',
      error: err.message
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user if valid token present, otherwise req.user is null without blocking.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, (err) => {
    if (err) req.user = null;
    next();
  });
}

/**
 * Role-Based Access Control Guard
 * Ensures req.user has one of the allowed roles (ADMIN is always granted access).
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = req.user.role;
    if (userRole === 'ADMIN' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Role '${userRole}' does not have sufficient permissions. Required: ${allowedRoles.join(' or ')}.`
    });
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireCustomer: requireRole(['CUSTOMER', 'ADMIN']),
  requireCook: requireRole(['COOK', 'ADMIN']),
  requireRider: requireRole(['DELIVERY_PARTNER', 'ADMIN']),
  requireAdmin: requireRole(['ADMIN'])
};
