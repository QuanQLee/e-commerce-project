package com.ds.catalog.service;

import java.util.List;

public record PageResult<T>(List<T> items, int page, int pageSize) {
}
