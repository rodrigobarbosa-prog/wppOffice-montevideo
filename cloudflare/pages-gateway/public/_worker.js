// Keep the public Pages URL and the visit service on the same origin.
// The bound Worker retains its own assets, rooms and GitHub deployment pipeline.
export default {
 fetch(request,env){return env.OFFICE.fetch(request);}
};
