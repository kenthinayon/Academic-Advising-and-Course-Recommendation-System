<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Render the SPA shell (React) for login only.
Route::view('/login', 'welcome')->name('login');

// Optional: send everything else to login.
Route::redirect('/', '/login');
Route::view('/{any}', 'welcome')->where('any', '.*');