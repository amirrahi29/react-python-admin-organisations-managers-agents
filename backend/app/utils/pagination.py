from math import ceil


def pagination_meta(*, page: int, page_size: int, total: int) -> dict:
    total_pages = ceil(total / page_size) if total else 0
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
