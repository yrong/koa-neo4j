MATCH (u:User)
WHERE id(u)={id}
RETURN count(u) > 0 AS exists
