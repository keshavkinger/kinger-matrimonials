module.exports = function (req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.redirect("/admin/login");
  }

  next();
};
