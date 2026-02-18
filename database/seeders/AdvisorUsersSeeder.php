<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdvisorUsersSeeder extends Seeder
{
    /**
     * Seed exactly 3 advisor accounts.
     *
     * NOTE: Passwords here are TEMPORARY. Change them immediately after first login.
     */
    public function run()
    {
        $advisors = [
            [
                'name' => 'Advisor 1',
                'email' => 'advisor1@uriosadvise.local',
                'password' => 'ChangeMeNow!123',
            ],
            [
                'name' => 'Advisor 2',
                'email' => 'advisor2@uriosadvise.local',
                'password' => 'ChangeMeNow!123',
            ],
            [
                'name' => 'Advisor 3',
                'email' => 'advisor3@uriosadvise.local',
                'password' => 'ChangeMeNow!123',
            ],
        ];

        foreach ($advisors as $advisor) {
            User::updateOrCreate(
                ['email' => $advisor['email']],
                [
                    'name' => $advisor['name'],
                    'password' => Hash::make($advisor['password']),
                    'role' => 'advisor',
                ]
            );
        }
    }
}
