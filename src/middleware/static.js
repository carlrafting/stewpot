// TODO: pass in root path dynamically

export default async (context) => {
    await context.send({
        root: `${Deno.cwd()}/public`,
        index: 'index.html',
    });
};
