// Takes {username} and returns user object with id and password
WITH {id: 2, user_name: {username}, hash: "test"} AS user
// Above serves as mock, should be gathered from real data
RETURN {id: user.id, first_name: {username}, password: user.hash}
