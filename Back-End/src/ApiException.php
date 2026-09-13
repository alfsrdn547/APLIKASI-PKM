<?php
namespace App;

class ApiException extends \Exception
{
    public readonly string $codeName;
    public readonly array $fields;

    public function __construct(
        string $codeName,
        string $publicMessage,
        array $fields = [],
        int $status = 400,
    ) {
        parent::__construct($publicMessage, $status);
        $this->codeName = $codeName;
        $this->fields = $fields;
    }

    public function status(): int
    {
        return (int) $this->getCode();
    }
}