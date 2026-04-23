<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Http\Controllers\AssessmentController;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class AssessmentDegreeTieBreakerTest extends TestCase
{
    private function degreesFromTop(array $top, array $scores, array $readinessCorrect): array
    {
        $controller = new AssessmentController();

        $m = new ReflectionMethod($controller, 'degreesFromTop');
        $m->setAccessible(true);

        /** @var array $out */
        $out = $m->invoke($controller, $top, $scores, $readinessCorrect);

        return $out;
    }

    public function testComputerStudiesPrefersBSCSWhenLogicalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Computer Studies', 'score' => 10]],
            ['Computer Studies' => 10],
            ['numerical_reasoning' => 1, 'logical_reasoning' => 4, 'verbal_reasoning' => 2]
        );

        $this->assertSame('BSCS', $out[0]['code']);
    }

    public function testComputerStudiesFallsBackToBSITWhenLogicalNotStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Computer Studies', 'score' => 10]],
            ['Computer Studies' => 10],
            ['numerical_reasoning' => 4, 'logical_reasoning' => 2, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSIT', $out[0]['code']);
    }

    public function testEngineeringPicksBSCEWhenNumericalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Engineering & Technology', 'score' => 10]],
            ['Engineering & Technology' => 10],
            ['numerical_reasoning' => 5, 'logical_reasoning' => 2, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSCE', $out[0]['code']);
    }

    public function testEngineeringPicksBSEEWhenLogicalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Engineering & Technology', 'score' => 10]],
            ['Engineering & Technology' => 10],
            ['numerical_reasoning' => 2, 'logical_reasoning' => 5, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSEE', $out[0]['code']);
    }

    public function testEngineeringPicksBSMEWhenVerbalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Engineering & Technology', 'score' => 10]],
            ['Engineering & Technology' => 10],
            ['numerical_reasoning' => 1, 'logical_reasoning' => 2, 'verbal_reasoning' => 5]
        );

        $this->assertSame('BSME', $out[0]['code']);
    }

    public function testAccountancyPicksBSAWhenNumericalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Accountancy', 'score' => 10]],
            ['Accountancy' => 10],
            ['numerical_reasoning' => 5, 'logical_reasoning' => 1, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSA', $out[0]['code']);
    }

    public function testAccountancyPicksBSMAWhenNumericalNotStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Accountancy', 'score' => 10]],
            ['Accountancy' => 10],
            ['numerical_reasoning' => 1, 'logical_reasoning' => 5, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSMA', $out[0]['code']);
    }

    public function testArtsAndSciencesPicksBACommWhenVerbalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Arts & Sciences', 'score' => 10]],
            ['Arts & Sciences' => 10],
            ['numerical_reasoning' => 1, 'logical_reasoning' => 2, 'verbal_reasoning' => 5]
        );

        $this->assertSame('BAComm', $out[0]['code']);
    }

    public function testArtsAndSciencesPicksBSPSYWhenVerbalNotStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Arts & Sciences', 'score' => 10]],
            ['Arts & Sciences' => 10],
            ['numerical_reasoning' => 2, 'logical_reasoning' => 5, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BSPSY', $out[0]['code']);
    }

    public function testTeacherEducationPicksBSEdWhenVerbalStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Teacher Education', 'score' => 10]],
            ['Teacher Education' => 10],
            ['numerical_reasoning' => 1, 'logical_reasoning' => 2, 'verbal_reasoning' => 5]
        );

        $this->assertSame('BSEd', $out[0]['code']);
    }

    public function testTeacherEducationPicksBEEdWhenVerbalNotStrongest(): void
    {
        $out = $this->degreesFromTop(
            [['rank' => 1, 'category' => 'Teacher Education', 'score' => 10]],
            ['Teacher Education' => 10],
            ['numerical_reasoning' => 5, 'logical_reasoning' => 2, 'verbal_reasoning' => 1]
        );

        $this->assertSame('BEEd', $out[0]['code']);
    }
}
