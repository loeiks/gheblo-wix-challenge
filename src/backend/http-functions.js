import { ok, forbidden, serverError } from 'wix-http-functions';
import weivData from '@exweiv/weiv-data';

export async function post_keepContainersAlive(req) {
    try {
        if (req.headers['x-exweiv-cluster-api'] !== "!EXWEIV-IST-CLUSTERS-1-2!") {
            return forbidden();
        } else {
            const now = performance.now();
            const result = await weivData.query('KeepServer/Warm').find();
            return ok({
                body: { result, ms: `${(performance.now() - now).toFixed(2)}ms` },
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
        }
    } catch (err) {
        console.error("Keep Containers Alive Error:", err);
        return serverError();
    }
}