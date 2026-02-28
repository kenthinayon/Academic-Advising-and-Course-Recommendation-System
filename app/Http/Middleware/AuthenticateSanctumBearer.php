<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthenticateSanctumBearer
{
    /**
     * Authenticate using Sanctum personal access tokens from Authorization: Bearer <token>.
     *
     * This app uses localStorage tokens on the frontend. Some environments/configs
     * may not properly resolve auth:sanctum on the API group, so we provide a
     * small explicit middleware.
     */
    public function handle(Request $request, Closure $next)
    {
        $auth = $request->header('Authorization');
        if (!is_string($auth) || stripos($auth, 'Bearer ') !== 0) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $plainTextToken = trim(substr($auth, 7));
        if ($plainTextToken === '') {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = PersonalAccessToken::findToken($plainTextToken);
        if (!$token || !$token->tokenable) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Sanctum tracks "last_used_at"; update it for basic auditing.
        try {
            $token->forceFill(['last_used_at' => now()])->save();
        } catch (\Throwable $e) {
            // ignore
        }

        // Attach the authenticated user to the request.
        $request->setUserResolver(fn () => $token->tokenable);

        return $next($request);
    }
}
