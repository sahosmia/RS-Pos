<?php

namespace App\Support;

use RuntimeException;

/**
 * Thrown on purpose at the end of an import preview so the surrounding transaction rolls back and nothing is kept.
 */
class PreviewRollback extends RuntimeException {}
