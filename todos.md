- [✅] Should it the interceptors be passed in as an array or via a chained method like the rest of the functions? In next-safe-action they use `.use()` and you can chain many of these. trpc also uses `.use()`. Do you think we should and can implement that as well so we can call .use() multiple times instead of passing in an array of interceptors since devs are used to that pattern instead?

- Any difference between .query() and .command() here? Would you suggest making them the same or is it better even just for the sake of naming to keep it different since trpc has mutation and query? But those probably end up being GET vs POST requests


- parsedInput should be strongly typed based on the inputSchema. The parsedInput type should be inferred from the inputSchema internally so consumers have a typesafe input and when they return it should be a typesafe output

- I want to use this on my services as well but my services don't need input or output validation they just need to be typed for their input and output and use the logger. Should I still use this function for that? And
