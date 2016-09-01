// Takses {id}, returns roles
WITH ["Reviewer", "Author"] AS labels, {id: {id}, user_name: "admin"} as user
// Above serves as mock, should be gathered from real data
WITH
collect(
    CASE
        WHEN any(l IN labels WHERE l="Author") THEN "author" ELSE NULL
    END
) +
collect(
    CASE
        WHEN any(l IN labels WHERE l="User") THEN "user" ELSE NULL
    END
) +
collect(
    CASE
        WHEN user.user_name="admin" THEN "admin" ELSE NULL
    END
) AS roles
RETURN {roles: roles}
