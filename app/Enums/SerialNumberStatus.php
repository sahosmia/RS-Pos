<?php

namespace App\Enums;

enum SerialNumberStatus: string
{
    case InStock = 'in_stock';
    case Sold = 'sold';
    case Returned = 'returned';
    case UnderWarrantyService = 'under_warranty_service';
    case Disposed = 'disposed';
}
